const request = require('request');
const $ = require('cheerio');
const {BigQuery} = require('@google-cloud/bigquery');

exports.japatalk = async (req, res) => {

  let email = req.query.email;
  let password = req.query.password;
  let date = req.query.date;
  let hour = req.query.hour;
  let minutes = req.query.minutes;
  let teacherId = req.query.teacherId | 1202;

  let stored;

  let cookie;
  let page;

  if(email && password){
    cookie = await loginStandalone(email, password).then(s=> s[0]);
  }

  console.log(`cookie: ${cookie}`)

  if(date && hour && minutes && teacherId){
    page = await bookClassFinishStandalone(date, hour, minutes, teacherId, cookie);
  }
   
  page = await viewTeacherPageStandalone(teacherId, cookie).then(s=> s);

  console.log('page loaded')

  // await storeTimestamp(page, teacherId).then(s=> stored = s);
  lastTimestamp = await getTeacherLastTimestamp(teacherId);
  timestamp = scrapLastTimestamp(page);

  console.log(`last: ${lastTimestamp} (${typeof lastTimestamp}), current: ${timestamp} (${typeof timestamp})`)
  console.log(`${lastTimestamp < timestamp}`)
  if (!lastTimestamp){
    storeTimestamp(timestamp, teacherId, 'CREATE');
  } else if(lastTimestamp < timestamp){
    storeTimestamp(timestamp, teacherId, 'REPLACE');
    notifyByEmail();
  }

  res.status(200).send(page);
}

async function loginStandalone(email, password){
  return new Promise((resolve, reject) => {
    request.post('https://www.japatalk.com/login_finish.php',
      { form: { wID: email, wPasswd: password } },
      (err, res, body) => {
        let cookies = res.headers['set-cookie'];

        if(cookies){
          resolve(cookies.filter(cookie => cookie.startsWith('rKey') && cookie.includes('japatalk')));
        }
      }
    )
  });
}

async function getTeacherLastTimestamp(teacherId){
  const bigquery = new BigQuery();

  const options = {
    query: `SELECT timestamp FROM \`cycles-265707.talktalk.timestamp\` where code = @code order by timestamp desc LIMIT 1`,
    params: {code: teacherId},
    location: 'asia-northeast1'
  };

  const [job] = await bigquery.createQueryJob(options);
  console.log(`Job ${job.id} started.`);
  
  const [rows] = await job.getQueryResults();
  return rows[0] ? new Date(rows[0].timestamp.value): undefined;
}

async function viewTeacherPageStandalone(teacherId, cookie) {
  let options = {
    headers: { 'Cookie': cookie }
  }
  return new Promise((resolve, reject) => {
    request.get(`https://www.japatalk.com/staff_detail_0000${teacherId}.php`, options,
      (err, res, body) => {
        let html = $.load(res.body);
        let script = '<script>function moveWithReserveInfoDay(script, date, hour, minutes, teacherId) { window.location.replace(`${window.location.href.split("?")[0]}?date=${date}&hour=${hour}&minutes=${minutes}&teacherId=${teacherId}&email=${document.getElementById("email").value}&password=${document.getElementById("pass").value}&teacherId=${document.getElementById("teacherId").value}`)}</script>'
        let inputs = "<label>Email:</label><input type='text' id='email'/><label>Password:</label><input type='password' id='pass' /><label>TeacherId:</label><input type='number' id='teacherId'/>";

        let head = html('head').html().replace('<script type="text/javascript" src="./js/tools.js?1605231000"></script>', script);
        let table = html('.cal-table').parent().html().replace(/javascript:moveWithReserveInfoDay\(/g, 'moveWithReserveInfoDay(');

        let updatedHtml = `<html><head>${head}</head><body>${script}<div id="main"><div class="container schedule">${inputs}${table}</div></div></body></html>`

        resolve(updatedHtml);
      }
    )
  });

}

function notifyByEmail(){
  console.log('notifying')
  let body = {
    "personalizations": [
        {
            "to": [
                { "email": "jopetor2@gmail.com", "name": "Jose" },
                { "email": "patricioon@hotmail.com", "name": "Patricioon" },
                { "email": "barruuu@gmail.com", "name": "rara" },
                { "email": "u2002994@gmail.com", "name": "Dani" }
            ],
            "dynamic_template_data": {
                "content":{
                    "redirect_url": "https://asia-northeast1-cycles-265707.cloudfunctions.net/poc-node-function",
                    "custom_message": "Hay clases nuevas con Non (teacher id: 1202)",
                    "redirect_message": "Ver horario"
                },
                "customer": "Ebrios patanes del jurado",
                "subject": "[CYBERDYNE][CYCLES] Japatalk notification"
            }
        }
    ],
    "template_id": "d-800cd277605d49839336cdc5dac25810",
    "from": {
        "email": "noreply@cyberdyne.jp",
        "name": "Cyberdyne"
    }
  }
  request.post('https://api.sendgrid.com/v3/mail/send', {
    body: JSON.stringify(body),
   
    (err, res, body) => {
      console.log('Notified')
    }
  );
}

function scrapLastTimestamp(page){
  let html = $.load(page);
  let timestampTag = html('.koma.open').last().attr('onclick').replace(/'/g, '').replace(/"/g, '').split(',').splice(1, 1).pop().trim();
  return new Date(timestampTag)
}

function storeTimestamp(timestamp, teacherId, action){
  const bigquery = new BigQuery();

  if(action == 'CREATE'){
    const options = {
      query: `INSERT INTO \`cycles-265707.talktalk.timestamp\` (code, timestamp) VALUES (@code, @timestamp)`,
      params: {code: teacherId, timestamp: timestamp},
      location: 'asia-northeast1'
    };

    bigquery.query(options);
  } else if(action == 'REPLACE'){
    const options = {
      query: `UPDATE \`cycles-265707.talktalk.timestamp\` SET timestamp = @timestamp WHERE code = @code`,
      params: {code: teacherId, timestamp: timestamp},
      location: 'asia-northeast1'
    };
    bigquery.query(options);
  }
}

async function bookClassFinishStandalone(date, hour, minutes, teacherId, cookie){

  return new Promise((resolve, reject) => {
    request.post(`https://www.japatalk.com/reservation_finish.php`,
      { form: { sty: `0000${teacherId}`, vHour: hour, vMinute: minutes, vStaffCD: teacherId, vDate: date, vStaff: 1, Reservation_wStaffCD: teacherId, Reservation_wTimeFrom: `${date} ${hour}:${minutes}:00`}, headers: { 'Cookie': cookie } },
      (err,res, body)=> {
        resolve(res.body);
      }
    )
  });
}
