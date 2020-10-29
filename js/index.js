const request = require('request');
const $ = require('cheerio');

exports.japatalk = async (req, res) => {

  let email = req.query.email;
  let password = req.query.password;
  let date = req.query.date;
  let hour = req.query.hour;
  let minutes = req.query.minutes;
  let teacherId = req.query.teacherId | 1202;

  let cookie;
  let page;

  if(email && password){
    console.log('get cookie')
    cookie = await loginStandalone(email, password).then(s=> s[0]);
  }

  console.log(`cookie: ${cookie}`)

  if(date && hour && minutes && teacherId){
    console.log('Book')
    page = await bookClassFinishStandalone(date, hour, minutes, teacherId, cookie);
  }
   
  console.log('teacher page')
  page = await viewTeacherPageStandalone(teacherId, cookie).then(s=> s);

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

async function viewTeacherPageStandalone(teacherId, cookie) {
  let options = {
    headers: { 'Cookie': cookie }
  }
  return new Promise((resolve, reject) => {
    request.get(`https://www.japatalk.com/staff_detail_0000${teacherId}.php`, options,
      (err, res, body) => {
        let html = $.load(res.body);
        let script = '<script>function moveWithReserveInfoDay(script, date, hour, minutes, teacherId) { window.location.replace(`${window.location.href}?date=${date}&hour=${hour}&minutes=${minutes}&teacherId=${teacherId}&email=${document.getElementById("email").value}&password=${document.getElementById("pass").value}&teacherId=${document.getElementById("teacherId").value}`)}</script>'
        let inputs = "<label>Email:</label><input type='text' id='email' /><label>Password:</label><input type='password' id='pass' /><label>TeacherId:</label><input type='number' id='teacherId' />";

        let head = html('head').html().replace('<script type="text/javascript" src="./js/tools.js?1605231000"></script>', script);
        let table = html('.cal-table').parent().html().replace(/javascript:moveWithReserveInfoDay\(/g, 'moveWithReserveInfoDay(');
        resolve(`<html><head>${head}</head><body><div id="main"><div class="container schedule">${inputs}${table}</div></div></body></html>`);
      }
    )
  });
}

async function bookClassStandalone(date, hour, minutes, teacherId, cookie){
  return new Promise((resolve, reject) => {
    request.post(`https://www.japatalk.com/reservation_confirm.php`,
      { form: { sty: `0000${teacherId}`, vHour: hour, vMinute: minutes, vStaffCD: teacherId, vDate: date, vStaff: 1 }, headers: { 'Cookie': cookie } },
      (err, res, body) => {
        resolve(res.body);
      }
    )
  });
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

//   sty: 00001202
// vHour: 20
// vMinute: 30
// vStaffCD: 1202
// vDate: 2020-11-12
// vThisMonth: 2020/10/01
// vStaff: 1
// vSearchMode: 
// Reservation_wTimeFrom: 2020-11-12 20:30:00
// Reservation_wStaffCD: 1202
// work: 
// vConfirm: 
// editReservationCD: 
// _r_e_l_o_a_d_: cab81a939e5b25d221ccdec11c465ea0