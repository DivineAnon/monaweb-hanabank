/**
 * Module dependencies.
 */
 var express = require('express')
 , routes = require('./routes')
 , user = require('./routes/user')
 , http = require('http')
 , favicon = require('serve-favicon')
 , oracledb = require('oracledb')
 , logger = require('morgan')
 , path = require('path')
 , bodyParser = require('body-parser')
 , app = express();
var router = express.Router();


var errorHandler = require('errorhandler');
var methodOverride = require('method-override');
var custrc = ['14', '34', '51', '52', '53', '55', '61', '62', '75', '76', '77', '88', 'N7', '93'];

app.use('/monaweb', router);
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(favicon(path.join(__dirname, 'public/monaweb/ico', 'favicon.ico')));
app.use(logger('dev'));
// parse application/json
app.use(bodyParser.json());
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('X-HTTP-Method')); //          Microsoft
app.use(methodOverride('X-HTTP-Method-Override')); // Google/GData
app.use(methodOverride('X-Method-Override')); //
app.use(function(req, res, next){
app.locals.pretty = true;
next()
});
app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));


// error handling middleware should be loaded after the loading the routes
if (app.get('env') === 'development') {
 app.use(errorHandler())
}
router.route('/')
 .get(function(req, res) {
     // invoked on get /foo/bar
     res.render("default");
 });

router.route('/lookuplog')
 .get(function(req, res) {
     res.render("layouts/lookuplog")
 });

router.route('/atmbubble')
 .get(function(req, res) {
     try{
         oracledb.getConnection(
             {
                 user:"HAPPCHNL",
                 password:"hachn3029",
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if(err){
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select substr(a.LOG_DATA, 15, 8) as atm_id, decode(substr(a.trx_cd, 0, 4), 'NWDL', 'WDL', 'XWDL', 'WDL', 'TRF') as trx_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'ATMD' and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no
        and a.trx_cd NOT IN ( 'NGTLNAP', 'NEW_KEY')
        and a.ret_ref_no = b.ret_ref_no and a.io_cd = 'I' and b.io_cd = 'O' and substr(a.trx_cd, 0, 4) IN ( 'NWDL', 'XWDL', 'NTRH', 'NTRO', 'XTRH', 'XTRO', 'NTIO', 'NTIH' ) group by substr(a.LOG_DATA, 15, 8), decode(substr(a.trx_cd, 0, 4), 'NWDL', 'WDL', 'XWDL', 'WDL', 'TRF') , b.resp_cd
        order by atm_id asc             
       `,
                     function (err, result) {
                         if (err){
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);
                         res.send(result);
                         doRelease(connection);
                     }
                 );
             }
         );
     } catch (e){
         next(e)
     }
 });

router.route('/atmouts')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select to_char(trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60,'HH24:MI') as dt, count(decode(t.resp_cd, '00', 1, null)) as approve, count(nvl(t.dt, null)) as tot
         from
         (
           -------------------------------------------- MAIN QUERY -----------------------------------------------------------------
           select (trunc(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'hh24') + (trunc(to_char(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'mi')/5)*5)/24/60) dt , a.trx_dt, a.trx_tm, b.resp_cd                 
           From aebk_eih_his a, aebk_eih_his b
           where a.trx_dt = trunc(sysdate) and a.switch_id = 'ATMD' and a.trx_tm >= (to_char(sysdate - (60/24/60), 'HH24:MI:SS'))
           and a.IO_CD = 'I' and b.IO_CD = 'O' and a.switch_id = b.switch_id and a.trx_dt = b.trx_dt and a.trc_ad_no = b.trc_ad_no
           and a.trx_cd NOT IN ( 'NEW_KEY', 'NGTLNAP') and b.trx_cd NOT IN ( 'NEW_KEY', 'NGTLNAP')
           -------------------------------------------------------------------------------------------------------------------------
         ) t,
         ( select to_date(to_char(sysdate, 'yyyy/mm/dd')||' '||substr(to_char(sysdate - (60/24/60), 'hh24:mi'), 0, 4)||'0','yyyy/mm/dd hh24:mi') +(rownum-1)*5/24/60 the_dt
           from all_objects
           where  rownum < (to_date(to_char(sysdate - (0/24/60), 'hh24:mi'),'hh24:mi')-to_date(to_char(sysdate - (60/24/60), 'hh24:mi'),'hh24:mi'))*24*60/5 + 2 ) t2
         where t.dt (+) = t2.the_dt
         group by  trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60  
         ORDER BY dt           
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });
 

router.route('/reuters')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select to_char(trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60,'HH24:MI:SS') as dt, count(t.ric) as tot
         from
         (
           -------------------------------------------- MAIN QUERY -----------------------------------------------------------------
           select (trunc(to_date(to_char(a.H_FEED_DT, 'yyyy/mm/dd')||' '||a.H_FEED_TM, 'yyyy/mm/dd hh24:mi:ss'),'hh24') + (trunc(to_char(to_date(to_char(a.H_FEED_DT, 'yyyy/mm/dd')||' '||a.H_FEED_TM, 'yyyy/mm/dd hh24:mi:ss'),'mi')/5)*5)/24/60) dt, substr( a.ric, 0, 3) as ric 
           From aebk_eih_ffx_cont a
           where a.H_FEED_DT = trunc(sysdate) and a.h_feed_tm >= (to_char(sysdate - (60/24/60), 'HH24:MI:SS'))              
           -------------------------------------------------------------------------------------------------------------------------
         ) t,
         ( select to_date(to_char(sysdate, 'yyyy/mm/dd')||' '||substr(to_char(sysdate - (60/24/60), 'hh24:mi'), 0, 4)||'0','yyyy/mm/dd hh24:mi') +(rownum-1)*5/24/60 the_dt
           from all_objects
           where  rownum < (to_date(to_char(sysdate - (0/24/60), 'hh24:mi'),'hh24:mi')-to_date(to_char(sysdate - (60/24/60), 'hh24:mi'),'hh24:mi'))*24*60/5 + 2 ) t2
         where t.dt (+) = t2.the_dt
         group by  trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60
         ORDER BY dt
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/outgoingstats')
 .get(function(req, res){
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select x.switch_id, nvl(y.tot, 0) as tot, nvl(y.success, 0) as tot from 
         ( select 'TIPH' as switch_id from dual UNION ALL 
           select 'SWDK' as switch_id from dual UNION ALL 
           select 'IONX' as switch_id from dual UNION ALL 
           select 'FINN' as switch_id from dual UNION ALL 
           select 'EURO' as switch_id from dual UNION ALL 
           select 'RNTS' as switch_id from dual UNION ALL
           select 'QRIS' as switch_id from dual UNION ALL 
           select 'BIIH' as switch_id from dual ) x,
         (select switch_id, count(1) as tot, count(decode(resp_cd, '00', 1, null)) as success from aebk_eoh_his where trx_dt = trunc(sysdate)
       and switch_id IN ( 'TIPH', 'IONX', 'FINN', 'EURO', 'BIIH', 'RNTS','QRIS' )
       group by switch_id 
       UNION ALL
       select switch_id, count(1) as tot, count(decode(resp_cd, '00', 1, null)) as success from aebk_eoh_his where trx_dt = trunc(sysdate)
       and switch_id = 'SWDK' AND (TRX_CD NOT IN ('DUKCALL', 'PDFMAIL') )
       group by switch_id) y
        where x.switch_id = y.switch_id (+)
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
});

router.route('/incomingstats')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select x.switch_id, nvl(y.tot, 0) as tot, nvl(y.success, 0) as tot from 
         ( select 'VADP' as switch_id from dual UNION ALL 
           select 'LNBI' as switch_id from dual UNION ALL 
           select 'RNTS' as switch_id from dual UNION ALL 
           select 'LOCL' as switch_id from dual UNION ALL 
           select 'GIBI' as switch_id from dual UNION ALL 
           select 'BRSM' as switch_id from dual UNION ALL 
           select 'ATMD' as switch_id from dual UNION ALL 
           select 'ARON' as switch_id from dual ) x,
         (select a.switch_id, count(1) as tot, count(decode(b.resp_cd, '00', 1, null)) as success from aebk_eih_his a, aebk_eih_his b            
          where a.trx_Dt = trunc(sysdate) and a.trx_dt = b.trx_dt (+) and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no
          and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
          and a.trx_cd NOT IN ( 'NEW_KEY','NGTLNAP' )
          and b.resp_cd NOT IN ( 'EF' )             
        and a.IO_CD = 'I' and b.IO_CD = 'O' group by a.switch_id ) y
        where x.switch_id = y.switch_id (+)
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/alltrx')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `SELECT 'INC', (to_char(sysdate - (0/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (220/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (210/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.trx_dt = b.trx_dt
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'OUT', (to_char(sysdate - (0/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (220/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (210/60/24/60), 'HH24:MI:SS'))
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/alltrxlong')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `SELECT * FROM ( 
       SELECT 'INC', (to_char(sysdate - (0/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (230/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (220/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'INC', (to_char(sysdate - (10/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (240/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (230/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt  and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'INC', (to_char(sysdate - (20/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (250/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (240/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt  and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'INC', (to_char(sysdate - (30/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (260/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (250/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt  and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'INC', (to_char(sysdate - (40/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (270/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (260/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt  and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'INC', (to_char(sysdate - (50/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (280/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (270/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'INC', (to_char(sysdate - (70/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (290/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (280/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'INC', (to_char(sysdate - (70/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (300/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (290/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'INC', (to_char(sysdate - (90/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (310/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (300/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'INC', (to_char(sysdate - (90/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (320/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (310/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL  
       SELECT 'INC', (to_char(sysdate - (100/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( b.resp_cd, '00', 1, null)) as success,
               count(1) as tot
         from aebk_eih_his a, aebk_eih_his b
         where a.trx_dt = trunc(sysdate) and a.reg_tm between (to_char(sysdate - (330/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (320/60/24/60), 'HH24:MI:SS')) 
         and a.switch_id = b.switch_id (+) and a.IO_CD = 'I' and b.IO_CD = 'O' and a.trc_ad_no = b.trc_ad_no and a.trx_dt = b.trx_dt and a.ret_ref_no = b.ret_ref_no
         and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
       UNION ALL          
       -----------------------------  
       SELECT 'OUT', (to_char(sysdate - (0/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (230/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (220/60/24/60), 'HH24:MI:SS'))
       UNION ALL
       SELECT 'OUT', (to_char(sysdate - (10/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (240/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (230/60/24/60), 'HH24:MI:SS'))
       UNION ALL
       SELECT 'OUT', (to_char(sysdate - (20/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (250/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (240/60/24/60), 'HH24:MI:SS'))
       UNION ALL
       SELECT 'OUT', (to_char(sysdate - (30/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (260/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (250/60/24/60), 'HH24:MI:SS'))
       UNION ALL
       SELECT 'OUT', (to_char(sysdate - (40/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (270/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (260/60/24/60), 'HH24:MI:SS'))
       UNION ALL
       SELECT 'OUT', (to_char(sysdate - (50/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (280/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (270/60/24/60), 'HH24:MI:SS'))
       UNION ALL
       SELECT 'OUT', (to_char(sysdate - (60/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (290/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (280/60/24/60), 'HH24:MI:SS'))
       UNION ALL
       SELECT 'OUT', (to_char(sysdate - (70/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (300/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (290/60/24/60), 'HH24:MI:SS'))
       UNION ALL
       SELECT 'OUT', (to_char(sysdate - (80/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (310/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (300/60/24/60), 'HH24:MI:SS'))
       UNION ALL
       SELECT 'OUT', (to_char(sysdate - (90/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (320/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (310/60/24/60), 'HH24:MI:SS'))
       UNION ALL
       SELECT 'OUT', (to_char(sysdate - (100/60/24/60), 'HH24:MI:SS')) as label,
               count(decode( resp_cd, '00', 1, null)) as success,
               count(1) as tot
       from aebk_eoh_his
       where trx_dt = trunc(sysdate) and reg_tm between (to_char(sysdate - (330/60/24/60), 'HH24:MI:SS')) and (to_char(sysdate - (320/60/24/60), 'HH24:MI:SS'))
       ) order by 'INC' asc, label asc
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/brsmouts')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select to_char(trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60,'HH24:MI') as dt, count(decode(t.resp_cd, '00', 1, null)) as approve, count(nvl(t.dt, null)) as tot
         from
         (
           -------------------------------------------- MAIN QUERY -----------------------------------------------------------------
           select (trunc(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'hh24') + (trunc(to_char(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'mi')/5)*5)/24/60) dt , a.trx_dt, a.trx_tm, b.resp_cd                 
           From aebk_eih_his a, aebk_eih_his b
           where a.trx_dt = trunc(sysdate) and a.switch_id = 'BRSM' and a.trx_tm >= (to_char(sysdate - (60/24/60), 'HH24:MI:SS'))
           and a.IO_CD = 'I' and b.IO_CD = 'O' and a.switch_id = b.switch_id and a.trx_dt = b.trx_dt and a.trc_ad_no = b.trc_ad_no
           and a.trx_cd NOT IN ( 'LOG__ON', 'LOG_OFF', 'NEW_KEY', 'ECHOMSG', 'CUTOVER' )
           -------------------------------------------------------------------------------------------------------------------------
         ) t,
         ( select to_date(to_char(sysdate, 'yyyy/mm/dd')||' '||substr(to_char(sysdate - (60/24/60), 'hh24:mi'), 0, 4)||'0','yyyy/mm/dd hh24:mi') +(rownum-1)*5/24/60 the_dt
           from all_objects
           where  rownum < (to_date(to_char(sysdate - (0/24/60), 'hh24:mi'),'hh24:mi')-to_date(to_char(sysdate - (60/24/60), 'hh24:mi'),'hh24:mi'))*24*60/5 + 2 ) t2
         where t.dt (+) = t2.the_dt
         group by  trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60
         ORDER BY dt
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/rntsouts')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select to_char(trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60,'HH24:MI') as dt, count(decode(t.resp_cd, '00', 1, null)) as approve, count(nvl(t.dt, null)) as tot
         from
         (
           -------------------------------------------- MAIN QUERY -----------------------------------------------------------------
           select (trunc(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'hh24') + (trunc(to_char(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'mi')/5)*5)/24/60) dt , a.trx_dt, a.trx_tm, b.resp_cd                 
           From aebk_eih_his a, aebk_eih_his b
           where a.trx_dt = trunc(sysdate) and a.switch_id = 'RNTS' and a.trx_tm >= (to_char(sysdate - (60/24/60), 'HH24:MI:SS'))
           and a.IO_CD = 'I' and b.IO_CD = 'O' and a.switch_id = b.switch_id and a.trx_dt = b.trx_dt and a.trc_ad_no = b.trc_ad_no
           and a.trx_cd NOT IN ( 'LOG__ON', 'LOG_OFF', 'NEW_KEY', 'ECHOMSG', 'CUTOVER' )
           UNION ALL
           select (trunc(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'hh24') + (trunc(to_char(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'mi')/5)*5)/24/60) dt , a.trx_dt, a.trx_tm, a.resp_cd                 
           From aebk_eoh_his a
           where a.trx_dt = trunc(sysdate) and a.switch_id = 'RNTS' and a.trx_tm >= (to_char(sysdate - (60/24/60), 'HH24:MI:SS'))  
           and a.trx_cd NOT IN ( '#LOG_ON', '#LOGOFF', '#CHGKEY', '#CUTOFF' )
           -------------------------------------------------------------------------------------------------------------------------
         ) t,
         ( select to_date(to_char(sysdate, 'yyyy/mm/dd')||' '||substr(to_char(sysdate - (60/24/60), 'hh24:mi'), 0, 4)||'0','yyyy/mm/dd hh24:mi') +(rownum-1)*5/24/60 the_dt
           from all_objects
           where  rownum < (to_date(to_char(sysdate - (0/24/60), 'hh24:mi'),'hh24:mi')-to_date(to_char(sysdate - (60/24/60), 'hh24:mi'),'hh24:mi'))*24*60/5 + 2 ) t2
         where t.dt (+) = t2.the_dt
         group by  trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60
         ORDER BY dt
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/visaouts')
 .get(function(req, res) {
     // invoked on get /foo/bar
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select to_char(trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60,'HH24:MI') as dt, count(decode(t.resp_cd, '00', 1, null)) as approve, count(nvl(t.dt, null)) as tot
         from
         (
           -------------------------------------------- MAIN QUERY -----------------------------------------------------------------
           select (trunc(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'hh24') + (trunc(to_char(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'mi')/5)*5)/24/60) dt , a.trx_dt, a.trx_tm, b.resp_cd                 
           From aebk_eih_his a, aebk_eih_his b
           where a.trx_dt = trunc(sysdate) and a.switch_id = 'ARON' and a.trx_tm >= (to_char(sysdate - (60/24/60), 'HH24:MI:SS'))
           and a.IO_CD = 'I' and b.IO_CD = 'O' and a.switch_id = b.switch_id and a.trx_dt = b.trx_dt and a.trc_ad_no = b.trc_ad_no
           and a.trx_cd NOT IN ( 'LG2_VON','LOG_VON','LOGVOFF', 'NEW_KEY', 'INITKEY', 'LG2VOFF' ) and b.resp_cd NOT IN ( 'N7', 'EF' )
           -------------------------------------------------------------------------------------------------------------------------
         ) t,
         ( select to_date(to_char(sysdate, 'yyyy/mm/dd')||' '||substr(to_char(sysdate - (60/24/60), 'hh24:mi'), 0, 4)||'0','yyyy/mm/dd hh24:mi') +(rownum-1)*5/24/60 the_dt
           from all_objects
           where  rownum < (to_date(to_char(sysdate - (0/24/60), 'hh24:mi'),'hh24:mi')-to_date(to_char(sysdate - (60/24/60), 'hh24:mi'),'hh24:mi'))*24*60/5 + 2 ) t2
         where t.dt (+) = t2.the_dt
         group by  trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60
         ORDER BY dt
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });
 
router.route('/qrisouts')
 .get(function(req, res) {
     // invoked on get /foo/bar
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select to_char(trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60,'HH24:MI') as dt, count(decode(t.resp_cd, '00', 1, null)) as approve, count(nvl(t.dt, null)) as tot
         from
         (
           -------------------------------------------- MAIN QUERY -----------------------------------------------------------------
           select (trunc(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'hh24') + (trunc(to_char(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'mi')/5)*5)/24/60) dt , a.trx_dt, a.trx_tm, decode(a.resp_cd, '00', '00', '05' ) as resp_cd                 
           From aebk_eoh_his a
           where a.trx_dt = trunc(sysdate) and a.switch_id = 'ARON' and a.trx_tm >= (to_char(sysdate - (60/24/60), 'HH24:MI:SS'))                           
           -------------------------------------------------------------------------------------------------------------------------
         ) t,
         ( select to_date(to_char(sysdate, 'yyyy/mm/dd')||' '||substr(to_char(sysdate - (60/24/60), 'hh24:mi'), 0, 4)||'0','yyyy/mm/dd hh24:mi') +(rownum-1)*5/24/60 the_dt
           from all_objects
           where  rownum < (to_date(to_char(sysdate - (0/24/60), 'hh24:mi'),'hh24:mi')-to_date(to_char(sysdate - (60/24/60), 'hh24:mi'),'hh24:mi'))*24*60/5 + 2 ) t2
         where t.dt (+) = t2.the_dt
         group by  trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60
         ORDER BY dt
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

 router.route('/dukcapilouts')
 .get(function(req, res) {
     // invoked on get /foo/bar
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select to_char(trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60,'HH24:MI') as dt, count(decode(t.resp_cd, '00', 1, null)) as approve, count(nvl(t.dt, null)) as tot
         from
         (
           -------------------------------------------- MAIN QUERY -----------------------------------------------------------------
           select (trunc(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'hh24') + (trunc(to_char(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'mi')/5)*5)/24/60) dt , a.trx_dt, a.trx_tm, decode(a.resp_cd, '00', '00', '05' ) as resp_cd                 
           From aebk_eoh_his a
           where a.trx_dt = trunc(sysdate) and a.switch_id = 'SWDK' AND a.trx_cd = 'DUKCAPL' and a.trx_tm >= (to_char(sysdate - (60/24/60), 'HH24:MI:SS'))                           
           -------------------------------------------------------------------------------------------------------------------------
         ) t,
         ( select to_date(to_char(sysdate, 'yyyy/mm/dd')||' '||substr(to_char(sysdate - (60/24/60), 'hh24:mi'), 0, 4)||'0','yyyy/mm/dd hh24:mi') +(rownum-1)*5/24/60 the_dt
           from all_objects
           where  rownum < (to_date(to_char(sysdate - (0/24/60), 'hh24:mi'),'hh24:mi')-to_date(to_char(sysdate - (60/24/60), 'hh24:mi'),'hh24:mi'))*24*60/5 + 2 ) t2
         where t.dt (+) = t2.the_dt
         group by  trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60
         ORDER BY dt
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/gibiouts')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select to_char(trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60,'HH24:MI') as dt, count(decode(t.resp_cd, '00', 1, null)) as approve, count(nvl(t.dt, null)) as tot
         from
         (
           -------------------------------------------- MAIN QUERY -----------------------------------------------------------------
           select (trunc(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'hh24') + (trunc(to_char(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'mi')/5)*5)/24/60) dt , a.trx_dt, a.trx_tm, b.resp_cd                 
           From aebk_eih_his a, aebk_eih_his b
           where a.trx_dt = trunc(sysdate) and a.switch_id = 'GIBI' and a.trx_tm >= (to_char(sysdate - (60/24/60), 'HH24:MI:SS'))
           and a.IO_CD = 'I' and b.IO_CD = 'O' and a.switch_id = b.switch_id and a.trx_dt = b.trx_dt and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd 
           and a.bsns_cd != 'ODS'
           and a.trx_cd NOT IN ( 'NEW_KEY')
           -------------------------------------------------------------------------------------------------------------------------
         ) t,
         ( select to_date(to_char(sysdate, 'yyyy/mm/dd')||' '||substr(to_char(sysdate - (60/24/60), 'hh24:mi'), 0, 4)||'0','yyyy/mm/dd hh24:mi') +(rownum-1)*5/24/60 the_dt
           from all_objects
           where  rownum < (to_date(to_char(sysdate - (0/24/60), 'hh24:mi'),'hh24:mi')-to_date(to_char(sysdate - (60/24/60), 'hh24:mi'),'hh24:mi'))*24*60/5 + 2 ) t2
         where t.dt (+) = t2.the_dt
         group by  trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60
         ORDER BY dt
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

 router.route('/lnbiouts')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select to_char(trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60,'HH24:MI') as dt, count(decode(t.resp_cd, '00', 1, null)) as approve, count(nvl(t.dt, null)) as tot
         from
         (
           -------------------------------------------- MAIN QUERY -----------------------------------------------------------------
           select (trunc(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'hh24') + (trunc(to_char(to_date(to_char(a.trx_dt, 'yyyy/mm/dd')||' '||a.trx_tm, 'yyyy/mm/dd hh24:mi:ss'),'mi')/5)*5)/24/60) dt , a.trx_dt, a.trx_tm, b.resp_cd                 
           From aebk_eih_his a, aebk_eih_his b
           where a.trx_dt = trunc(sysdate) and a.switch_id = 'LNBI' and a.trx_tm >= (to_char(sysdate - (60/24/60), 'HH24:MI:SS'))
           and a.IO_CD = 'I' and b.IO_CD = 'O' and a.switch_id = b.switch_id and a.trx_dt = b.trx_dt and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd 
           and a.bsns_cd != 'ODS'
           and a.trx_cd NOT IN ( 'NEW_KEY')
           -------------------------------------------------------------------------------------------------------------------------
         ) t,
         ( select to_date(to_char(sysdate, 'yyyy/mm/dd')||' '||substr(to_char(sysdate - (60/24/60), 'hh24:mi'), 0, 4)||'0','yyyy/mm/dd hh24:mi') +(rownum-1)*5/24/60 the_dt
           from all_objects
           where  rownum < (to_date(to_char(sysdate - (0/24/60), 'hh24:mi'),'hh24:mi')-to_date(to_char(sysdate - (60/24/60), 'hh24:mi'),'hh24:mi'))*24*60/5 + 2 ) t2
         where t.dt (+) = t2.the_dt
         group by  trunc(the_dt,'hh24') + (trunc(to_char(the_dt,'mi')/5)*5)/24/60
         ORDER BY dt
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/billpaymentmon')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select c.cnts_4 as prod, count(decode(b.resp_cd, '00', 1, null)) as appr, count(1) as tot /*a.**/              
           from aebk_eih_his a, aebk_eih_his b , (select * from aebk_eih_cnts where cnts_nm = 'PART_CENT_ID') c
           where a.trx_dt = trunc(sysdate) and a.switch_id IN ( 'VADP', 'SMSD', 'LOCL', 'GIBI', 'ATMD' )
           and a.trx_cd IN ( '0520A01', 'NBLLPOS', 'NBLLPAY' )
           and a.IO_CD = 'I' and b.IO_CD = 'O' and a.ret_ref_no = b.ret_ref_no
           and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no
           and substr(a.LOG_DATA, 86, 5) = c.cnts_2 
         group by c.cnts_4
         order by count(1) desc
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/byonoff')
 .get(function(req, res) {
     try {
         // let result = `
         // {"metaData":[{"name":"NAME"},{"name":"CODE"},{"name":"COUNT"}],"rows":[["Token 3DS","05",669],["NON Token 3DS","06",7381]]}
         // `
         // res.send(result)
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `SELECT decode(onoff, null, 'OFFLINE', '05', 'Success 3DS', '06', 'Trying 3DS', '07', 'Failed 3DS', onoff) AS name, onoff, count(1) AS count FROM EC25_HIS_TRX_DEBIT_INQ
                     WHERE trx_dt >= trunc(sysdate - 30)
                     GROUP BY onoff
                     order by count desc
                     `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result, 'ini onoff');

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/bymerchant')
 .get(function(req, res) {
     try {
         // let result = `
         // {"metaData":[{"name":"NAME"},{"name":"LOCATION"},{"name":"COUNT"},{"name":"TOTAL"}],"rows":[["PLANET BAN","JAKARTA",6516,3631480000],["DANA","JAKARTA",296,27566643],["Blibli.com","JAKARTA",96,28266567],["TOKOPEDIA","JAKARTA",96,33252306],["SHOPEE.CO.ID","JAKARTA",92,15396257],["JD.ID","JAKARTA",41,20106000],["PT. INDO BUMI LESTARI","JAKARTA",37,22241964],["HYPERMART,KEMANG VILLA","JAKARTA",18,9367203],["MID*PTAplikasiKaryaAna","JAKARTA",14,14000],["INDO BUMI LESTARI PT","JAKARTA",13,8137023]]}
         // `
         // res.send(result)

         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `SELECT * FROM 
                     (SELECT merchant_name, location, count(1) AS freq_trx, sum(trx_amount) AS total_trx FROM EC25_HIS_TRX_DEBIT_INQ
                     WHERE trx_dt >= trunc(sysdate - 30)  and merchant_name is not null
                     GROUP BY merchant_name, location
                     ORDER BY freq_trx DESC)t
                     WHERE rownum <= 10
                     `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/bymcc')
 .get(function(req, res) {
     try {
         // let result = `
         // {"metaData":[{"name":"MCC"},{"name":"TITLE"},{"name":"FREQ_TRX"},{"name":"TOTAL_TRX"}],"rows":[["2222","Warteg",6587,3682830000],["5499","Miscellaneous Food Stores Convenience Stores and Specialty Markets",322,64023194],["5814","Fast Food Restaurants",260,31971986],["5411","Grocery Stores and Supermarkets",250,132377528],["5262","Marketplaces",235,68907480],["6540","Non Financial Institutions,  Stored Value Card Purchase/Load",146,11784796],["5812","Eating Places and Restaurants",101,31380695],["5300","Wholesale Clubs",96,28266567],["5541","Service Stations (with or without Ancillary Services",25,4373927],["5462","Bakeries",24,3035760.04]]}
         // `
         // res.send(result)

         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `SELECT * FROM 
                     (SELECT merchant_tp AS mcc, decode(merchant_tp, ' 0763', 'Agricultural Cooperatives', ' 3010', 'KLM (ROYAL DUTCH AIRLINES)', ' 3103', 'GARUDA (INDONESIA)', 
                     ' 3513', 'WESTIN', ' 3570', 'FORUM HOTELS', ' 3640', 'HYATT HOTELS', ' 3715', 'FAIRFIELD INN', ' 3742', 'CLUB MED', ' 4112', 'Passenger Railways', 
                     ' 4121', 'Taxicabs and Limousines', ' 4131', 'Bus Lines', 
                     ' 4214', 'Motor Freight Carriers and Trucking, Local and Long Distance, Moving and Storage Companies, and Local Delivery Services', 
                     ' 4215', 'Courier Services, Air and Ground, and Freight Forwarders.', ' 4511', 'Airlines and Air Carriers (Not Elsewhere Classified)', 
                     ' 4722', 'Travel Agencies and Tour Operators', 
                     ' 4789', 'Transportation Services (Not Elsewhere Classified)', ' 4812', 'Telecommunication Equipment and Telephone Sales', 
                     ' 4814', 'Telecommunication Services, including Local and Long Distance Calls, Credit Card Calls, Calls Through Use of Magnetic Stripe Reading Telephones, and Fax Services', 
                     ' 4816', 'Computer Network/Information Services', ' 5045', 'Computers and Computer Peripheral Equipment and Software', 
                     ' 5111', 'Stationery, Office Supplies, Printing and Writing Paper ', 
                     ' 5200', 'Home Supply Warehouse Stores', ' 5300', 'Wholesale Clubs', ' 5309', 'Duty Free Stores', 
                     ' 5310', 'Discount Stores', ' 5311', 'Department Stores', ' 5331', 'Variety Stores', 
                     ' 5399', 'Miscellaneous General Merchandise', ' 5411', 'Grocery Stores and Supermarkets', 
                     ' 5422', 'Freezer and Locker Meat Provisioners', ' 5441', 'Candy, Nut, and Confectionery Stores', 
                     ' 5451', 'Dairy Product Stores', ' 5462', 'Bakeries', 
                     ' 5499', 'Miscellaneous Food Stores, Convenience Stores and Specialty Markets', 
                     ' 5511', 'Car and Truck Dealers (New and Used) Sales, Service, Repairs, Parts, and Leasing', 
                     ' 5533', 'Automotive Parts and Accessories Stores', ' 5541', 'Service Stations (With or without Ancillary Services)', 
                     ' 5611', 'Men’s and Boys’ Clothing and Accessories Stores', ' 5621', 'Women’s Ready To Wear Stores', 
                     ' 5631', 'Women’s Accessory and Specialty Shops', ' 5641', 'Children’s and Infants’ Wear Stores', 
                     ' 5651', 'Family Clothing Stores', ' 5655', 'Sports and Riding Apparel Stores', ' 5661', 'Shoe Stores', 
                     ' 5691', 'Men’s and Women’s Clothing Stores', ' 5699', 'Miscellaneous Apparel and Accessory Shops', 
                     ' 5712', 'Furniture, Home Furnishings, and Equipment Stores, Except Appliances', 
                     ' 5719', 'Miscellaneous Home Furnishing Specialty Stores', ' 5722', 'Household Appliance Stores', 
                     ' 5732', 'Electronics Stores', ' 5811', 'Caterers', 
                     ' 5812', 'Eating Places and Restaurants', ' 5813', 'Drinking Places (Alcoholic Beverages), Bars, Taverns, Nightclubs, Cocktail Lounges, and Discotheques', 
                     ' 5814', 'Fast Food Restaurants', ' 5912', 'Drug Stores and Pharmacies', ' 5921', 'Package Stores, Beer, Wine, and Liquor', 
                     ' 5941', 'Sporting Goods Stores', ' 5942', 'Book Stores', ' 5943', 'Stationery Stores, Office and School Supply Stores', 
                     ' 5944', 'Jewelry Stores, Watches, Clocks, and Silverware Stores', ' 5945', 'Hobby, Toy, and Game Shops', 
                     ' 5947', 'Gift, Card, Novelty and Souvenir Shops', ' 5948', 'Luggage and Leather Goods Stores', 
                     ' 5949', 'Sewing, Needlework, Fabric and Piece Goods Stores', ' 5977', 'Cosmetic Stores', 
                     ' 5992', 'Florists', ' 5995', 'Pet Shops, Pet Foods and Supplies Stores', 
                     ' 5999', 'Miscellaneous and Specialty Retail Stores', ' 7011', 'Lodging, Hotels, Motels, Resorts, Central Reservation Services (Not Elsewhere Classified)', 
                     ' 7012', 'Timeshares', ' 7033', 'Trailer Parks and Campgrounds', ' 7221', 'Photographic Studios', 
                     ' 7230', 'Beauty and Barber Shops', ' 7297', 'Massage Parlors', ' 7298', 'Health and Beauty Spas', 
                     ' 7299', 'Miscellaneous Personal Services (Not Elsewhere Classified)', ' 7399', 'Business Services (Not Elsewhere Classified)', 
                     ' 7512', 'Automobile Rental Agency', ' 7523', 'Parking Lots, Parking Meters and Garages', 
                     ' 7531', 'Automotive Body Repair Shops', ' 7538', 'Automotive Service Shops (Non Dealer)', 
                     ' 7631', 'Watch, Clock and Jewelry Repair', ' 7832', 'Motion Picture Theaters', 
                     ' 7929', 'Bands, Orchestras, and Miscellaneous Entertainers (Not Elsewhere Classified)', 
                     ' 7941', 'Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters', 
                     ' 7991', 'Tourist Attractions and Exhibits', ' 7992', 'Public Golf Courses', 
                     ' 7994', 'Video Game Arcades/Establishments', ' 7996', 'Amusement Parks, Circuses, Carnivals, and Fortune Tellers', 
                     ' 7997', 'Membership Clubs (Sports, Recreation, Athletic), Country Clubs, and Private Golf Courses', 
                     ' 7999', 'Recreation Services (Not Elsewhere Classified)', ' 8011', 'Doctors and Physicians (Not Elsewhere Classified)', 
                     ' 8021', 'Dentists and Orthodontists', ' 8042', 'Optometrists and Ophthalmologists', ' 8043', 'Opticians, Optical Goods, and Eyeglasses', 
                     ' 8062', 'Hospitals', ' 8099', 'Medical Services and Health Practitioners (Not Elsewhere Classified)', ' 8299', 'Schools and Educational Services (Not Elsewhere Classified)', 
                     ' 8999', 'Professional Services (Not Elsewhere Classified)', ' 9399', 'Government Services (Not Elsewhere Classified)', 
                     ' 9402', 'Postal Services, Government Only', 
                     0742, 'Veterinary Services', 0763, 'Agricultural Co operatives', 1520, 'General Contractors, Residential and Commercial', 
                     1731, 'Electrical Contractors', 1799, 'Special Trade Contractors (Not Elsewhere Classified)', 
                     2741, 'Miscellaneous Publishing and Printing', 3082, 'KOREAN AIRLINES', 3098, 'ASIANA AIRLINES', 
                     3103, 'GARUDA (INDONESIA)', 3136, 'QATAR AIRWAYS', 3501, 'HOLIDAY INNS', 3502, 'BEST WESTERN HOTELS', 
                     3503, 'SHERATON', 3504, 'HILTON HOTELS', 3509, 'MARRIOTT', 3512, 'INTERCONTINENTAL HOTELS', 
                     3513, 'WESTIN', 3518, 'SOL HOTELS', 3519, 'PULLMAN INTERNATIONAL HOTELS', 3520, 'MERIDIEN HOTELS', 
                     3522, 'TOKYO HOTEL', 3533, 'HOTEL IBIS', 3535, 'HILTON INTERNATIONALS', 3543, 'FOUR SEASONS HOTELS', 
                     3545, 'SHANGRILA INTERNATIONAL', 3570, 'FORUM HOTELS', 3577, 'MANDARIN ORIENTAL HOTEL', 
                     3579, 'HOTEL MERCURE', 3589, 'DORAL GOLF RESORT', 3634, 'SWISSOTEL', 3640, 'HYATT HOTELS', 
                     3642, 'NOVOTEL HOTELS', 3700, 'MOTEL 6', 3703, 'RESIDENCE INNS', 3710, 'THE RITZ-CARLTON', 
                     3721, 'HILTON CONRAD', 3741, 'MILLENNIUM HOTELS', 3755, 'THE HOMESTEAD', 3779, 'W HOTELS', 
                     4011, 'Railroads', 4111, 'Local and Suburban Commuter Passenger Transport', 4112, 'Passenger Railways', 
                     4121, 'Taxicabs and Limousines', 4131, 'Bus Lines', 4214, 'Motor Freight Carriers and Trucking, Local and Long Distance, Moving and Storage Companies, and Local Delivery Services', 4215, '', 4225, '', 4411, '', 
                     4511, 'Airlines and Air Carriers (Not Elsewhere Classified)', 4582, 'Airports, Flying Fields, and Airport Terminals', 
                     4722, 'Travel Agencies and Tour Operators', 4784, 'Tolls and Bridge Fees', 4789, 'Transportation Services (Not Elsewhere Classified)', 
                     4812, 'Telecommunication Equipment and Telephone Sales', 4814, 'Telecommunication Services, including Local and Long Distance Calls, Credit Card Calls, Calls Through Use of Magnetic Stripe Reading Telephones, and Fax Services', 
                     4816, 'Computer Network/Information Services', 4829, 'Money Transfer', 4899, 'Cable, Satellite and Other Pay Television/Radio/Streaming Services', 
                     4900, 'Utilities, Electric, Gas, Water, and Sanitary', 5013, 'Motor Vehicle Supplies and New Parts', 5021, 'Office and Commercial Furniture', 
                     5039, 'Construction Materials (Not Elsewhere Classified)', 5044, 'Photographic, Photocopy, Microfilm Equipment and Supplies', 
                     5045, 'Computers and Computer Peripheral Equipment and Software', 5046, 'Commercial Equipment (Not Elsewhere Classified)', 
                     5047, 'Medical, Dental, Ophthalmic and Hospital Equipment and Supplies', 5051, 'Metal Service Centers and Offices', 
                     5065, 'Electrical Parts and Equipment', 5072, 'Hardware, Equipment and Supplies', 5074, 'Plumbing and Heating Equipment and Supplies', 
                     5085, 'Industrial Supplies (Not Elsewhere Classified)', 5094, 'Precious Stones and Metals, Watches and Jewelry', 
                     5099, 'Durable Goods (Not Elsewhere Classified)', 5111, 'Stationery, Office Supplies, Printing and Writing Paper', 
                     5122, 'Drugs, Drug Proprietaries, and Druggist Sundries', 5131, 'Piece Goods, Notions, and Other Dry Goods', 
                     5137, 'Men’s, Women’s, and Children’s Uniforms and Commercial Clothing', 5139, 'Commercial Footwear', 
                     5169, 'Chemicals and Allied Products (Not Elsewhere Classified)', 5172, 'Petroleum and Petroleum Products', 
                     5192, 'Books, Periodicals and Newspapers', 5193, 'Florists Supplies, Nursery Stock and Flowers', 
                     5199, 'Nondurable Goods (Not Elsewhere Classified)', 5200, 'Home Supply Warehouse Stores', 
                     5211, 'Lumber and Building Materials Stores', 5231, '– Glass, Paint, and Wallpaper Stores', 
                     5251, 'Hardware Stores', 5261, 'Nurseries and Lawn and Garden Supply Stores', 
                     5262, 'Marketplaces', 5271, 'Mobile Home Dealers', 5300, 'Wholesale Clubs', 5309, 'Duty Free Stores', 
                     5310, 'Discount Stores', 5311, 'Department Stores', 5331, 'Variety Stores', 
                     5399, 'Miscellaneous General Merchandise', 5411, 'Grocery Stores and Supermarkets', 
                     5422, 'Freezer and Locker Meat Provisioners', 5441, 'Candy, Nut, and Confectionery Stores', 
                     5451, 'Dairy Product Stores', 5462, 'Bakeries', 5499, 'Miscellaneous Food Stores Convenience Stores and Specialty Markets', 
                     5511, 'Car and Truck Dealers (New and Used) Sales, Service, Repairs, Parts, and Leasing', 
                     5521, 'Car and Truck Dealers (Used Only) Sales, Service, Repairs, Parts, and Leasing', 
                     5532, 'Automotive Tire Stores', 5533, 'Automotive Parts and Accessories Stores', 
                     5541, 'Service Stations (with or without Ancillary Services', 5542, 'Automated Fuel Dispensers', 
                     5571, '– Motorcycle Shops and Dealers', 5592, 'Motor Home Dealers', 5598, 'Snowmobile Dealers', 
                     5599, 'Miscellaneous Automotive, Aircraft, and Farm Equipment Dealers (Not Elsewhere Classified)', 
                     5611, 'Men’s and Boys’ Clothing and Accessories Stores', 5621, 'Women’s Ready to Wear Stores', 
                     5631, 'Women’s Accessory and Specialty Shops', 5641, 'Children’s and Infants’ Wear Stores', 
                     5651, 'Family Clothing Stores', 5655, 'Sports and Riding Apparel Stores', 
                     5661, 'Shoe Stores', 5691, 'Men’s and Women’s Clothing Stores', 5697, 'Tailors, Seamstresses, Mending, and Alterations', 
                     5698, 'Wig and Toupee Stores', 5699, 'Miscellaneous Apparel and Accessory Shops', 
                     5712, 'Furniture, Home Furnishings, and Equipment Stores, Except Appliances', 
                     5713, 'Floor Covering Stores', 5714, 'Drapery, Window Covering, and Upholstery Stores', 
                     5719, 'Miscellaneous Home Furnishing Specialty Stores', 5722, 'Household Appliance Stores', 
                     5732, 'Electronics Stores', 5733, 'Music Stores, Musical Instruments, Pianos, and Sheet Music', 
                     5734, 'Computer Software Stores', 5735, 'Record Stores',
                     5811, 'Caterers', 5812, 'Eating Places and Restaurants', 
                     5813, 'Drinking Places (Alcoholic Beverages), Bars, Taverns, Nightclubs, Cocktail Lounges, and Discotheques', 
                     5814, 'Fast Food Restaurants', 5815, 'Digital Goods Media, Books, Movies, Music', 
                     5816, 'Digital Goods, Games', 5817, 'Digital Goods, Applications (Excludes Games)', 
                     5818, 'Digital Goods, Large Digital Goods Merchant', 5912, 'Drug Stores and Pharmacies', 
                     5921, 'Package Stores, Beer, Wine, and Liquor', 5931, 'Used Merchandise and Secondhand Stores', 
                     5932, 'Antique Shops, Sales, Repairs, and Restoration Services', 5937, 'Antique Reproductions', 
                     5940, 'Bicycle Shops, Sales and Service', 5941, 'Sporting Goods Store', 5942, 'Book Stores', 
                     5943, 'Stationery Stores, Office and School Supply Stores', 5944, 'Jewelry Stores, Watches, Clocks, and Silverware Stores', 
                     5945, 'Hobby, Toy, and Game Shops', 5946, 'Camera and Photographic Supply Stores', 
                     5947, 'Gift, Card, Novelty and Souvenir Shops', 5948, 'Luggage and Leather Goods Stores', 
                     5949, 'Sewing, Needlework, Fabric and Piece Goods Stores', 5950, 'Glassware/Crystal Stores', 
                     5964, 'Direct Marketing, Catalog Merchant', 5965, 'Direct Marketing Combination Catalog and Retail Merchant', 
                     5967, 'Direct Marketing, Inbound Teleservices Merchant', 
                     5969, 'Direct Marketing – Other Direct Marketers (Not Elsewhere Classified)', 
                     5970, 'Artist’s Supply and Craft Shops', 5971, 'Art Dealers and Galleries', 5972, 'Stamp and Coin Stores', 
                     5973, 'Religious Goods Stores', 5976, 'Orthopedic Goods – Prosthetic Devices', 5977, 'Cosmetic Stores', 
                     5983, 'Fuel Dealers, Fuel Oil, Wood, Coal, and Liquefied Petroleum', 5992, 'Florists', 
                     5993, 'Cigar Stores and Stands', 5994, 'News Dealers and Newsstands', 5995, 'Pet Shops, Pet Foods and Supplies Stores', 
                     5996, 'Swimming Pools, Sales and Service', 5997, 'Electric Razor Stores, Sales and Service', 
                     5999, 'Miscellaneous and Specialty Retail Stores', 6011, 'Financial Institutions, Automated Cash Disbursements', 
                     6012, 'Financial Institutions, Merchandise, Services, and Debt Repayment', 
                     6051, 'Non-Financial Institutions, Foreign Currency, Non-Fiat Currency (for example: Cryptocurrency), Money Orders (Not Money Transfer), Account Funding (not Stored Value Load), Travelers Cheques, and Debt Repayment', 
                     6211, 'Security Brokers/Dealers', 6300, 'Insurance Sales, Underwriting, and Premiums', 
                     6513, 'Real Estate Agents and Managers', 6540, 'Non Financial Institutions,  Stored Value Card Purchase/Load', 
                     7011, 'Lodging, Hotels, Motels, Resorts, Central Reservation Services (Not Elsewhere Classified)', 
                     7012, 'Timeshares', 7032, 'Sporting and Recreational Camps', 7033, 'Trailer Parks and Campgrounds', 
                     7210, 'Laundry, Cleaning, and Garment Services', 7211, 'Laundries, Family and Commercial', 7216, 'Dry Cleaners', 
                     7217, 'Carpet and Upholstery Cleaning', 7221, 'Photographic Studios', 7230, 'Beauty and Barber Shops', 
                     7251, 'Shoe Repair Shops, Shoe Shine Parlors, and Hat Cleaning Shops', 7261, 'Funeral Services and Crematories', 
                     7277, 'Counseling Services, Debt, Marriage, and Personal', 7278, 'Buying and Shopping Services and Clubs', 
                     7296, 'Clothing Rental, Costumes, Uniforms, Formal Wear', 7297, 'Massage Parlors', 
                     7298, 'Health and Beauty Spas', 7299, 'Miscellaneous Personal Services', 
                     7311, 'Advertising Services', 7333, 'Commercial Photography, Art, and Graphics', 
                     7338, 'Quick Copy, Reproduction, and Blueprinting Services', 7349, 'Cleaning, Maintenance, and Janitorial Services', 
                     7372, 'Computer Programming, Data Processing, and Integrated Systems Design Services', 7379, 'Computer Maintenance, Repair and Services', 
                     7392, 'Management, Consulting, and Public Relations Services', 7394, 'Equipment, Tool, Furniture, and Appliance Rental and Leasing', 
                     7395, 'Photofinishing Laboratories and Photo Developing', 7399, 'Business Services', 
                     7512, 'Automobile Rental Agency', 7523, 'Parking Lots, Parking Meters and Garages', 
                     7531, 'Automotive Body Repair Shops', 7535, 'Automotive Paint Shops', 7538, 'Automotive Service Shops (Non-Dealer)', 
                     7542, 'Car Washes', 7622, 'Electronics Repair Shops', 7623, 'Air Conditioning and Refrigeration Repair Shops', 
                     7629, 'Electrical and Small Appliance Repair Shops', 7631, 'Watch, Clock and Jewelry Repair', 
                     7641, 'Furniture, Reupholstery, Repair, and Refinishing', 7699, 'Miscellaneous Repair Shops and Related Services', 
                     7832, 'Motion Picture Theaters', 7841, 'DVD/Video Tape Rental Stores', 7911, 'Dance Halls, Studios and Schools', 
                     7922, 'Theatrical Producers (Except Motion Pictures) and Ticket Agencies', 
                     7929, 'Bands, Orchestras, and Miscellaneous Entertainers (Not Elsewhere Classified)', 
                     7932, 'Billiard and Pool Establishments', 7933, 'Bowling Alleys', 7941, 'Commercial Sports, Professional Sports Clubs, Athletic Fields, and Sports Promoters', 
                     7991, 'Tourist Attractions and Exhibits', 7992, 'Public Golf Courses', 7993, 'Video Amusement Game Supplies', 
                     7994, 'Video Game Arcades/Establishments', 7996, 'Amusement Parks, Circuses, Carnivals, and Fortune Tellers', 
                     7997, 'Membership Clubs (Sports, Recreation, Athletic), Country Clubs, and Private Golf Courses', 
                     7998, 'Aquariums, Seaquariums, Dolphinariums, and Zoos', 7999, 'Recreation Services', 8011, 'Doctors and Physicians', 
                     8021, 'Dentists and Orthodontists', 8031, 'Osteopaths', 8041, 'Chiropractors', 
                     8042, 'Optometrists and Ophthalmologists', 8043, 'Opticians, Optical Goods, and Eyeglasses', 
                     8050, 'Nursing and Personal Care Facilities', 8062, 'Hospitals', 8071, 'Medical and Dental Laboratories', 
                     8099, 'Medical Services and Health Practitioners', 8111, 'Legal Services and Attorneys', 
                     8211, 'Elementary and Secondary Schools', 8220, 'Colleges, Universities, Professional Schools, and Junior Colleges', 
                     8244, 'Business and Secretarial Schools', 8249, 'Vocational and Trade Schools', 8299, 'Schools and Educational Services', 
                     8351, 'Child Care Services', 8398, 'Charitable Social Service Organizations', 8641, 'Civic, Social, and Fraternal Associations', 
                     8661, 'Religious Organizations', 8675, 'Automobile Associations', 8699, 'Membership Organizations', 8911, 'Architectural, Engineering, and Surveying Services', 
                     8999, 'Professional Services', 9399, 'Government Services', 9402, 'Postal Services – Government Only', 
                     merchant_tp) AS title, count(1) AS freq_trx, sum(trx_amount) AS total_trx FROM EC25_HIS_TRX_DEBIT_INQ
                     WHERE trx_dt >= trunc(sysdate - 30) and merchant_tp is not null
                     GROUP BY merchant_tp
                     ORDER BY freq_trx DESC)t
                     WHERE rownum <= 10
                     `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result);

                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/mapsouts')
.get(function(req, res) {
 // invoked on get /foo/bar
 try {
     oracledb.getConnection(
         {
             user          : "HAPPCHNL",
             password      : "hachn3029",
             //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
             // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
             connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
         },
         function(err, connection)
         {
             if (err) {
                 console.error(err.message);
                 return;
             }
             connection.execute(
                 `SELECT decode(code_nm, 'DI LUAR INDONESIA', 'id-3700', 'NANGGROE ACEH DARUSSALAM', 'id-ac', 'JAWA TENGAH', 'id-jt', 'BENGKULU', 'id-be', 'BANTEN', 'id-bt', 'KALIMANTAN BARAT', 'id-kb', 
                 'KEP. BANGKA BELITUNG', 'id-bb', 'BALI','id-ba', 'JAWA TIMUR', 'id-ji', 'KALIMANTAN SELATAN', 'id-ks', 'NUSA TENGGARA TIMUR', 'id-nt', 'SULAWESI SELATAN', 'id-se', 
                 'KEP. RIAU', 'id-kr', 'IRIAN JAYA BARAT', 'id-ib', 'SUMATERA UTARA', 'id-su', 'RIAU', 'id-ri', 'SULAWESI UTARA', 'id-sw', 'KALIMANTAN UTARA', 'id-ku', 'MALUKU UTARA', 'id-la', 
                 'SUMATERA BARAT', 'id-sb', 'MALUKU', 'id-ma', 'NUSA TENGGARA BARAT', 'id-nb', 'SULAWESI TENGGARA', 'id-sg', 'SULAWESI TENGAH', 'id-st', 'PAPUA', 'id-pa', 'JAWA BARAT', 'id-jr', 
                 'KALIMANTAN TIMUR', 'id-ki', 'LAMPUNG', 'id-1024', 'DKI JAKARTA', 'id-jk', 'GORONTALO', 'id-go', 'D.I YOGYAKARTA', 'id-yo', 'SUMATERA SELATAN', 'id-sl', 'SULAWESI BARAT', 'id-sr', 
                 'JAMBI', 'id-ja', 'KALIMANTAN TENGAH', 'id-kt', code_nm) AS "name", 
                 total_trx AS "value", TO_CHAR(trx_amount,'99,999,999,999,999.99') AS "trx_amt_total", TO_CHAR(trx_amount/total_trx,'99,999,999,999,999.99') as "trx_amt_avg"
                     FROM(
                         SELECT code_nm, SUM(CASE WHEN code_nm LIKE code_nm THEN 1 END)as total_trx,
                         sum(CASE WHEN code_nm LIKE code_nm THEN trx_amount END)as trx_amount
                         FROM(
                         SELECT merchant_name, loc, h.code1, c.code, c.code_nm, trx_amount FROM(
                             SELECT distinct merchant_name, loc, trx_amount, 
                             CASE WHEN code_nm LIKE '%' ||loc|| '%' THEN code1 ELSE '-' end as code1
                             FROM(
                             SELECT merchant_name, 
                             CASE WHEN location LIKE '%Depok%' THEN 'DEPOK' ELSE TRIM(UPPER(substr(LOCATION,1,8))) end as loc,
                             trx_amount
                             FROM EC25_HIS_TRX_DEBIT_INQ
                             WHERE trx_dt >= trunc(sysdate - 30) and location != ' ' and location not like '%-%'
                             )t LEFT JOIN acom_comh_code B ON b.code_nm like '%' || t.loc || '%' and type = 'F787'
                         )h LEFT JOIN acom_comh_code C ON c.code = h.code1 and type= 'F795'
                         )j GROUP BY code_nm
                     )k WHERE CODE_NM IS NOT null
   `,[],{ outFormat: oracledb.OUT_FORMAT_OBJECT },
                 function(err, result)
                 {
                     if (err) {
                         console.error(err.message);
                         doRelease(connection);
                         return;
                     }
                     console.log(result);

                     res.send(result.rows);
                     doRelease(connection);
                 });
         });
 } catch (e) {
     next(e)
 }
});

router.route('/monitoring')
 .get(function(req, res) {
     res.render("layouts/monitoring")
 });

 router.route('/monitoring_2')
 .get(function(req, res) {
     res.render("layouts/monitoring_2")
 });

router.route('/monitoring_maps')
 .get(function(req, res) {
     res.render("layouts/monitoring_maps")
 });

router.route('/monitoring_alt')
 .get(function(req, res) {
     res.render("layouts/monitoring_alt")
 });

router.route('/summary')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select * from (
        select 'ATMD' as switch_id, bsns_cd, io_cd, resp_cd, count(1) as cntt from aebk_eih_his where trx_dt = trunc(sysdate) and switch_id = 'ATMD' and trx_cd NOT IN ( 'NGTLNAP') group by bsns_cd, io_cd, resp_cd
        UNION ALL
        select 'GIBI', bsns_cd, io_cd, resp_cd, count(1) from aebk_eih_his where trx_dt = trunc(sysdate) and switch_id = 'GIBI' group by bsns_cd, io_cd, resp_cd
        UNION ALL
        select 'LOCL', bsns_cd, io_cd, resp_cd, count(1) from aebk_eih_his where trx_dt = trunc(sysdate) and switch_id = 'LOCL' group by bsns_cd, io_cd, resp_cd
        UNION ALL
        select 'RNTS', bsns_cd, io_cd, resp_cd, count(1) from aebk_eih_his where trx_dt = trunc(sysdate) and switch_id = 'RNTS' group by bsns_cd, io_cd, resp_cd
        UNION ALL
        select 'BRSM', bsns_cd, io_cd, resp_cd, count(1) from aebk_eih_his where trx_dt = trunc(sysdate) and switch_id = 'BRSM' group by bsns_cd, io_cd, resp_cd
        UNION ALL
        select 'VADP', bsns_cd, io_cd, resp_cd, count(1) from aebk_eih_his where trx_dt = trunc(sysdate) and switch_id = 'VADP' group by bsns_cd, io_cd, resp_cd
        UNION ALL
        select 'ARON', bsns_cd, io_cd, resp_cd, count(1) from aebk_eih_his where trx_dt = trunc(sysdate) and switch_id = 'ARON' group by bsns_cd, io_cd, resp_cd
        UNION ALL
        select 'SMSD', bsns_cd, io_cd, resp_cd, count(1) from aebk_eih_his where trx_dt = trunc(sysdate) and switch_id = 'SMSD' group by bsns_cd, io_cd, resp_cd
        UNION ALL 
        select 'RNTS', bsns_cd, io_cd, resp_cd, count(1) from aebk_eih_his where trx_dt = trunc(sysdate) and switch_id = 'SMSD' group by bsns_cd, io_cd, resp_cd
        UNION ALL 
        select 'RNTS', 'EB1', 'A', resp_cd, count(1) from aebk_eoh_his where trx_dt = trunc(sysdate) and switch_id = 'RNTS' group by bsns_cd,  resp_cd
        UNION ALL 
        select 'FINN', 'EB1', 'A', resp_cd, count(1) from aebk_eoh_his where trx_dt = trunc(sysdate) and switch_id = 'FINN' group by bsns_cd,  resp_cd
        UNION ALL 
        select 'EURO', 'EB1', 'A', resp_cd, count(1) from aebk_eoh_his where trx_dt = trunc(sysdate) and switch_id = 'EURO' group by bsns_cd,  resp_cd
        UNION ALL 
        select 'IONX', 'EB1', 'A', resp_cd, count(1) from aebk_eoh_his where trx_dt = trunc(sysdate) and switch_id = 'IONX' group by bsns_cd,  resp_cd
        UNION ALL 
        select 'BIIH', 'EB1', 'A', resp_cd, count(1) from aebk_eoh_his where trx_dt = trunc(sysdate) and switch_id = 'BIIH' group by bsns_cd,  resp_cd
        UNION ALL 
        select 'TIPH', 'EB1', 'A', resp_cd, count(1) from aebk_eoh_his where trx_dt = trunc(sysdate) and switch_id = 'TIPH' group by bsns_cd,  resp_cd
        UNION ALL 
        select 'SWDK', 'EB1', 'A', resp_cd, count(1) from aebk_eoh_his where trx_dt = trunc(sysdate) and switch_id = 'SWDK' and trx_cd IN ( 'HNCNINQ','HNCNPAY' ) group by bsns_cd,  resp_cd
        ) order by switch_id, bsns_cd, io_cd, cntt 
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.render("layouts/summary", { data: result });
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/summary_new')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select * from (
         select 'ATMD' as switch_id, a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'ATMD' and a.trx_cd NOT IN ( 'NGTLNAP' )
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O'
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select 'GIBI', a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'GIBI' 
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O' and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select 'LOCL', a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'LOCL' 
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O'
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select 'VADP', a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'VADP' 
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O'
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select 'SMSD', a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'SMSD' 
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O'
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select 'ARON', a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'ARON' 
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O'
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select 'BRSM', a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'BRSM' 
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O'
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select 'RNTS', a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'RNTS' 
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O'
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select switch_id, 'EB1', decode(resp_cd, '00', decode(resp_val, null, resp_cd, decode(trim(regexp_substr(resp_val, '\[.{2}\]')), '', '93', substr(regexp_substr(resp_val, '\[.{2}\]'),2,2) )), null, '93', resp_cd) as resp_cd, count(1) as cntt 
         from aebk_eoh_his where trx_dt = trunc(sysdate) and switch_id IN ( 'RNTS', 'DIMO', 'FINN', 'TIPH', 'EURO', 'IONX', 'BIIH' )
         group by switch_id, decode(resp_cd, '00', decode(resp_val, null, resp_cd, decode(trim(regexp_substr(resp_val, '\[.{2}\]')), '', '93', substr(regexp_substr(resp_val, '\[.{2}\]'),2,2) )), null, '93', resp_cd)
         UNION ALL
         select switch_id, 'EB1', decode(resp_cd, '00', decode(resp_val, null, resp_cd, decode(trim(regexp_substr(resp_val, '\[.{2}\]')), '', '93', substr(regexp_substr(resp_val, '\[.{2}\]'),2,2) )), null, '93', resp_cd) as resp_cd, count(1) as cntt 
         from aebk_eoh_his where trx_dt = trunc(sysdate) and switch_id = 'SWDK' AND (TRX_CD NOT IN ('DUKCALL', 'PDFMAIL') ) 
         group by switch_id, decode(resp_cd, '00', decode(resp_val, null, resp_cd, decode(trim(regexp_substr(resp_val, '\[.{2}\]')), '', '93', substr(regexp_substr(resp_val, '\[.{2}\]'),2,2) )), null, '93', resp_cd)
         ) order by 
             case
                 when switch_id = 'GIBI' and bsns_cd = 'MBK' then 1
                 when switch_id = 'GIBI' and bsns_cd = 'PBK' then 2
                 when switch_id = 'GIBI' and bsns_cd = 'CBS' then 3
                 when switch_id = 'SMSD' and bsns_cd = 'EB1' then 4
                 when switch_id = 'ATMD' and bsns_cd = 'EB1' then 5
                 when switch_id = 'LOCL' and bsns_cd = 'EB1' then 6
                 when switch_id = 'VADP' and bsns_cd = 'EB1' then 7
                 when switch_id = 'RNTS' and bsns_cd = 'EB1' then 8
                 when switch_id = 'BRSM' and bsns_cd = 'EB1' then 9
                 when switch_id = 'TIPH' and bsns_cd = 'EB1' then 10
                 when switch_id = 'IONX' and bsns_cd = 'EB1' then 12
                 when switch_id = 'FINN' and bsns_cd = 'EB1' then 13
                 when switch_id = 'EURO' and bsns_cd = 'EB1' then 14
                 when switch_id = 'BIIH' and bsns_cd = 'EB1' then 15
                 when switch_id = 'ARON' and bsns_cd = 'EB1' then 16
             when switch_id = 'SWDK' and bsns_cd = 'EB1' then 17
                 when switch_id = 'DIMO' and bsns_cd = 'EB1' then 18
                 else 19
              end                    
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.render("layouts/summary2", { data: result, rccust: custrc });
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/check')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select DISTINCT switch_id, bsns_cd
         from (
             select switch_id, bsns_cd
                     from aebk_eih_his
                     where trx_dt = trunc(sysdate) 
                     and switch_id = 'ATMD' 
                     group by switch_id, bsns_cd
                     UNION ALL
                     select switch_id, bsns_cd
                     from aebk_eih_his
                     where trx_dt = trunc(sysdate) 
                     and switch_id = 'GIBI' 
                     and bsns_cd != 'ODS'
                     group by switch_id, bsns_cd
                     UNION ALL
                     select switch_id, bsns_cd
                     from aebk_eih_his 
                     where trx_dt = trunc(sysdate) 
                     and switch_id = 'LOCL' 
                     group by switch_id, bsns_cd
                     UNION ALL
                     select switch_id, bsns_cd
                     from aebk_eih_his
                     where trx_dt = trunc(sysdate) 
                     and switch_id = 'VADP' 
                     group by switch_id, bsns_cd
                     UNION ALL
                     select switch_id, bsns_cd
                     from aebk_eih_his
                     where trx_dt = trunc(sysdate) 
                     and switch_id = 'SMSD' 
                     group by switch_id, bsns_cd
                     UNION ALL
                     select switch_id, bsns_cd 
                     from aebk_eih_his
                     where trx_dt = trunc(sysdate) 
                     and switch_id = 'ARON'        
                     group by switch_id, bsns_cd
                     UNION ALL
                     select switch_id, bsns_cd
                     from aebk_eih_his
                     where trx_dt = trunc(sysdate) 
                     and switch_id = 'BRSM' 
                     group by switch_id, bsns_cd
                     UNION ALL
                     select switch_id, bsns_cd
                     from aebk_eih_his
                     where trx_dt = trunc(sysdate) 
                     and switch_id = 'RNTS' 
                     group by switch_id,bsns_cd
                     UNION ALL
                     select switch_id, 'EB1' bsns_cd 
                     from aebk_eoh_his 
                     where trx_dt = trunc(sysdate) 
                     and switch_id IN ( 'RNTS', 'FINN', 'TIPH', 'EURO', 'IONX', 'BIIH', 'SWDK' )
                     group by switch_id, 'EB1' 
                     ) order by 
                         case
                             when switch_id = 'GIBI' and bsns_cd = 'MBK' then 1
                             when switch_id = 'GIBI' and bsns_cd = 'PBK' then 2
                             when switch_id = 'GIBI' and bsns_cd = 'CBS' then 3
                             when switch_id = 'SMSD' and bsns_cd = 'EB1' then 4
                             when switch_id = 'ATMD' and bsns_cd = 'EB1' then 5
                             when switch_id = 'LOCL' and bsns_cd = 'EB1' then 6
                             when switch_id = 'VADP' and bsns_cd = 'EB1' then 7
                             when switch_id = 'RNTS' and bsns_cd = 'EB1' then 8
                             when switch_id = 'BRSM' and bsns_cd = 'EB1' then 9
                             when switch_id = 'TIPH' and bsns_cd = 'EB1' then 10
                             when switch_id = 'IONX' and bsns_cd = 'EB1' then 12
                             when switch_id = 'FINN' and bsns_cd = 'EB1' then 13
                             when switch_id = 'EURO' and bsns_cd = 'EB1' then 14
                             when switch_id = 'BIIH' and bsns_cd = 'EB1' then 15
                             when switch_id = 'ARON' and bsns_cd = 'EB1' then 16
                             when switch_id = 'SWDK' and bsns_cd = 'EB1' then 17
                             else 18
                          end                     
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.render("layouts/check", { data: result, rccust: custrc });
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/check_result')
 .post(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {

                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `SELECT * FROM (
                 SELECT TO_CHAR(TRX_DT,'DD/MM/YYYY') TRX_DT, TRX_TM, TRC_AD_NO, RET_REF_NO, SWITCH_ID, BSNS_CD, TRX_CD, SVC_CD, RESP_CD 
                 FROM AEBK_EIH_HIS
                 WHERE SWITCH_ID = '` + req.body.channel + `'
                 AND (TRX_DT)=TRUNC(SYSDATE)
                 AND IO_CD = 'I'
                 AND
                 (
                     LOG_DATA LIKE '%` + req.body.search + `%'
                     AND LOG_DATA LIKE '%` + req.body.search1 + `%'
                     AND LOG_DATA LIKE '%` + req.body.search2 + `%'
                 )
                 UNION ALL
                 SELECT TO_CHAR(TRX_DT,'DD/MM/YYYY') TRX_DT, TRX_TM, TRC_AD_NO, RET_REF_NO, SWITCH_ID,'EB1' BSNS_CD,TRX_CD,'' SVC_CD, RESP_CD
                 FROM AEBK_EOH_HIS
                 WHERE SWITCH_ID = '` + req.body.channel + `'
                 AND (TRX_DT)=TRUNC(SYSDATE)
                 AND (TRX_CD NOT IN ('DUKCALL', 'PDFMAIL') )
                 AND
                 (
                     (
                         I_LOG_DATA LIKE '%` + req.body.search + `%'
                         AND I_LOG_DATA LIKE '%` + req.body.search1 + `%'
                         AND I_LOG_DATA LIKE '%` + req.body.search2 + `%'
                     )
                     OR
                     (
                         O_LOG_DATA LIKE '%` + req.body.search + `%'
                         AND O_LOG_DATA LIKE '%` + req.body.search1 + `%'
                         AND O_LOG_DATA LIKE '%` + req.body.search2 + `%'
                     )
                 )
             ) t
             ORDER BY t.TRX_TM DESC
             `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.render("layouts/check_result", { data: result, qsearch : req.body.search, qsearch1 : req.body.search1, qsearch2 : req.body.search2 });
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/check_detail')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `SELECT * FROM (
             SELECT SWITCH_ID
             ,SUBSTR(LOG_DATA,
             (
                 SELECT SUM(HLI_FLD_LENG) +301 FROM aebk_eih_map
                 WHERE ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `') 
                 OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `'))
                 AND SEQ_NO < 
                 (
                     SELECT SEQ_NO FROM aebk_eih_map WHERE (HLI_FLD_NM LIKE '%CCY_CD%' OR HLI_FLD_NM LIKE '%CURRENCY%')
                     and ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `')
                     OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `'))
                 )
             )
             ,
             (
                 SELECT HLI_FLD_LENG FROM aebk_eih_map WHERE (HLI_FLD_NM LIKE '%CCY_CD%' OR HLI_FLD_NM LIKE '%CURRENCY%')
                 and ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `') 
                 OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `')))
             ) ccy
             ,TO_CHAR(SUBSTR(LOG_DATA,
             (
                 SELECT SUM(HLI_FLD_LENG) +301 FROM aebk_eih_map
                 WHERE ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `') 
                 OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `'))
                 AND SEQ_NO < 
                 (
                     SELECT SEQ_NO FROM aebk_eih_map WHERE (HLI_FLD_NM LIKE '%TRX_AMT%' OR HLI_FLD_NM LIKE '%TRANSACTION_AMOUNT%')
                     and ((inout_cd = 'O' AND substr(map_id,0,7) = '` + req.query.trxcd + `')
                     OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `'))
                 )
             )
             ,
             (
                 SELECT HLI_FLD_LENG FROM aebk_eih_map WHERE (HLI_FLD_NM LIKE '%TRX_AMT%' OR HLI_FLD_NM LIKE '%TRANSACTION_AMOUNT%')
                 and ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `') 
                 OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `')))
             ),'999,999,999.00') amt
             ,TO_CHAR(TRX_DT,'DD/MM/YYYY')
             ,TRX_TM
             ,RET_REF_NO
             ,TRX_CD
             ,BSNS_CD
             , resp_cd
             FROM AEBK_EIH_HIS
             WHERE TRX_DT=TRUNC(SYSDATE)
             AND IO_CD = 'I'
             AND SWITCH_ID = '` + req.query.switch + `'
             AND TRC_AD_NO = '` + req.query.trcad + `'
             AND RET_REF_NO = '` + req.query.retref + `'
             UNION ALL
             SELECT SWITCH_ID
             ,NVL(
             SUBSTR(I_LOG_DATA,
             (
                 SELECT SUM(HLI_FLD_LENG) +301 FROM aebk_eih_map
                 WHERE ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `') 
                 OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `'))
                 AND SEQ_NO < 
                 (
                     SELECT SEQ_NO FROM aebk_eih_map WHERE (HLI_FLD_NM LIKE '%CCY_CD%' OR HLI_FLD_NM LIKE '%CURRENCY%')
                     and ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `')
                     OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `'))
                 )
             )
             ,
             (
                 SELECT HLI_FLD_LENG FROM aebk_eih_map WHERE (HLI_FLD_NM LIKE '%CCY_CD%' OR HLI_FLD_NM LIKE '%CURRENCY%')
                 and ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `') 
                 OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `')))
             ),' ') ccy
             ,NVL(
             TO_CHAR(SUBSTR(I_LOG_DATA,
             (
                 SELECT SUM(HLI_FLD_LENG) +301 FROM aebk_eih_map
                 WHERE ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `') 
                 OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `'))
                 AND SEQ_NO < 
                 (
                     SELECT SEQ_NO FROM aebk_eih_map WHERE (HLI_FLD_NM LIKE '%TRX_AMT%' OR HLI_FLD_NM LIKE '%TRANSACTION_AMOUNT%')
                     and ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `')
                     OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `'))
                 )
             )
             ,
             (
                 SELECT HLI_FLD_LENG FROM aebk_eih_map WHERE (HLI_FLD_NM LIKE '%TRX_AMT%' OR HLI_FLD_NM LIKE '%TRANSACTION_AMOUNT%')
                 and ((inout_cd = 'I' AND substr(map_id,0,7) = '` + req.query.trxcd + `') 
                 OR (inout_cd = 'C' AND substr(map_id,0,7) = '` + req.query.inoutcdc + `')))
             ),'999,999,999.00'),0) amt
             ,TO_CHAR(TRX_DT,'DD/MM/YYYY')
             ,TRX_TM
             ,RET_REF_NO
             ,TRX_CD
             ,BSNS_CD
             , resp_cd
             FROM AEBK_EOH_HIS
             WHERE TRX_DT=TRUNC(SYSDATE)
             AND SWITCH_ID = '` + req.query.switch + `'
             AND TRC_AD_NO = '` + req.query.trcad + `'
             AND RET_REF_NO = '` + req.query.retref + `'
             )
             `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.render("layouts/check_detail", { data: result });
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/billpayment')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select a.switch_id,
                a.bsns_cd,
                decode(a.trx_cd,
                       '0420A01',
                       'Inquiry',
                       'NBLLCHK',
                       'Inquiry',
                       'NBLLINQ',
                       'Inquiry',
                       'Payment/Purchase') as trx_cd,
                c.cnts_4,
                b.resp_cd,
                1, substr(a.LOG_DATA, 86, 5)
         from aebk_eih_his a,
              aebk_eih_his b,
              (select * from aebk_eih_cnts where cnts_nm = 'PART_CENT_ID') c
         where a.trx_dt = trunc(sysdate)
         and a.switch_id IN ('VADP', 'SMSD', 'LOCL', 'GIBI', 'ATMD')
         and a.trx_cd IN
               ('0420A01', '0520A01', 'NBLLPOS', 'NBLLPAY', 'NBLLINQ', 'NBLLCHK')
         and a.IO_CD = 'I'
         and b.IO_CD = 'O'
         and a.trx_dt (+)= b.trx_dt
         and a.switch_id = b.switch_id
         and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no
         and substr(a.LOG_DATA, 86, 5) = c.cnts_2            
         group by a.switch_id, a.bsns_cd, a.trx_cd, c.cnts_4, b.resp_cd, a.LOG_DATA
         order by a.switch_id, a.bsns_cd, a.trx_cd, c.cnts_4
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.render("layouts/billpayment", { data: result });
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/billpayment_new')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select a.switch_id,
                a.bsns_cd,
                decode(a.trx_cd,
                       '0420A01',
                       'Inquiry',
                       'NBLLCHK',
                       'Inquiry',
                       'NBLLINQ',
                       'Inquiry',
                       'Payment/Purchase') as trx_cd,
                c.cnts_4,
                b.resp_cd,
                1, substr(a.LOG_DATA, 86, 5)
         from aebk_eih_his a,
              aebk_eih_his b,
              (select * from aebk_eih_cnts where cnts_nm = 'PART_CENT_ID') c
         where a.trx_dt = trunc(sysdate)
         and a.switch_id IN ('VADP', 'SMSD', 'LOCL', 'GIBI', 'ATMD')
         and a.trx_cd IN
               ('0420A01', '0520A01', 'NBLLPOS', 'NBLLPAY', 'NBLLINQ', 'NBLLCHK')
         and a.IO_CD = 'I'
         and b.IO_CD = 'O'
         and a.trx_dt (+)= b.trx_dt
         and a.switch_id = b.switch_id
         and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no
         and substr(a.LOG_DATA, 86, 5) = c.cnts_2            
         group by a.switch_id, a.bsns_cd, a.trx_cd, c.cnts_4, b.resp_cd, a.LOG_DATA
         order by a.switch_id, a.bsns_cd, a.trx_cd, c.cnts_4
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.render("layouts/billpayment2", { data: result, rccust: custrc });
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/channel')
 .get(function(req, res) {
     // invoked on get /foo/bar
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select * from (
        select 'ATMD' as switch, 'EB1' as bsns, c.cnts_1 as trx_cd, x.resp_cd, count(x.resp_cd) from
                      (select a.trx_cd, b.resp_cd from aebk_eih_his a, aebk_eih_his b 
                       where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = 'ATMD'
                       and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id and a.ret_ref_no = b.ret_ref_no) x,
                      (select * from aebk_eih_cnts where cnts_nm = 'INTER_ID' and cnts_5 = 'ATMD' and cnts_1 not like 'X%' ) c 
            where 1=1    
            and x.trx_cd (+) = c.cnts_1
        group by c.cnts_1, x.resp_cd
        UNION ALL
        select 'GIBI', x.bsns_cd, c.cnts_1, x.resp_cd, count(x.resp_cd) from
                      (select a.bsns_cd, a.trx_cd, b.resp_cd from aebk_eih_his a, aebk_eih_his b 
                       where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = 'GIBI'
                       and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id and a.ret_ref_no = b.ret_ref_no
                       UNION ALL
                       select substr(O_LOG_DATA, 312, 3), trx_cd, resp_cd from aebk_eoh_his
                       where switch_id IN ( 'RNTS','BRSM') and trx_cd like '0%' and trx_dt = trunc(sysdate)               
                        ) x,
                      (select * from aebk_eih_cnts where cnts_nm = 'INTER_ID' and cnts_5 = 'GIBI' and cnts_1 not like 'X%' ) c 
            where 1=1    
            and x.trx_cd (+) = c.cnts_1
        group by c.cnts_1, x.bsns_cd, x.resp_cd
        UNION ALL
        select 'SMSD', 'EB1', c.cnts_1, x.resp_cd, count(x.resp_cd) from
                      (select a.trx_cd, b.resp_cd from aebk_eih_his a, aebk_eih_his b 
                       where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = 'SMSD'
                       and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id and a.ret_ref_no = b.ret_ref_no) x,
                      (select * from aebk_eih_cnts where cnts_nm = 'INTER_ID' and cnts_5 = 'SMSD' and cnts_1 not like 'X%' ) c 
            where 1=1    
            and x.trx_cd (+) = c.cnts_1
        group by c.cnts_1, x.resp_cd
        UNION ALL
        select 'VADP', 'EB1', c.cnts_1, x.resp_cd, count(x.resp_cd) from
                      (select a.trx_cd, b.resp_cd from aebk_eih_his a, aebk_eih_his b 
                       where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = 'VADP'
                       and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id and a.ret_ref_no = b.ret_ref_no ) x,
                      (select * from aebk_eih_cnts where cnts_nm = 'INTER_ID' and cnts_5 = 'VADP' and cnts_1 not like 'X%' ) c 
            where 1=1    
            and x.trx_cd (+) = c.cnts_1
        group by c.cnts_1, x.resp_cd
        ) order by switch, bsns, trx_cd 
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.render("layouts/channel", { data: result });
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/channel_new')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select * from (
        select 'ATMD' as switch, 'EB1' as bsns, c.cnts_1 as trx_cd, x.resp_cd, count(x.resp_cd) from
                      (select a.trx_cd, b.resp_cd from aebk_eih_his a, aebk_eih_his b 
                       where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = 'ATMD'
                       and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id and a.ret_ref_no = b.ret_ref_no
                       and a.trx_cd <> 'NWDLCRL'
                       UNION ALL
                       select a.trx_cd, a.resp_cd from aebk_eih_his a, aebk_eih_his b 
                       where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = 'ATMD'
                       and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id 
                       and a.trx_cd = 'NWDLCRL'
                       ) x,
                      (select * from aebk_eih_cnts where cnts_nm = 'INTER_ID' and cnts_5 = 'ATMD' and cnts_1 not like 'X%' ) c 
            where 1=1    
            and x.trx_cd (+) = c.cnts_1
        group by c.cnts_1, x.resp_cd
        UNION ALL
        select 'GIBI', x.bsns_cd, c.cnts_1, x.resp_cd, count(x.resp_cd) from
                      (select a.bsns_cd, a.trx_cd, b.resp_cd from aebk_eih_his a, aebk_eih_his b 
                       where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = 'GIBI'
                       and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
                       and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id and a.ret_ref_no = b.ret_ref_no
                       UNION ALL
                       select substr(O_LOG_DATA, 312, 3), trx_cd, resp_cd from aebk_eoh_his
                       where switch_id IN ( 'RNTS','BRSM') and trx_cd like '0%' and trx_dt = trunc(sysdate)               
                        ) x,
                      (select * from aebk_eih_cnts where cnts_nm = 'INTER_ID' and cnts_5 = 'GIBI' and cnts_1 not like 'X%'
                       UNION ALL
                       select 'INTER_ID', 'NBLLPOS', 'XX', 'XX', 'Inward', 'GIBI', 0, 0, null, null, null, null, null, null from dual
                       UNION ALL
                       select 'INTER_ID', 'NBLLPAY', 'XX', 'XX', 'Inward', 'GIBI', 0, 0, null, null, null, null, null, null from dual ) c 
            where 1=1    
            and x.trx_cd (+) = c.cnts_1
        group by c.cnts_1, x.bsns_cd, x.resp_cd
        UNION ALL
        select 'SMSD', 'EB1', c.cnts_1, x.resp_cd, count(x.resp_cd) from
                      (select a.trx_cd, b.resp_cd from aebk_eih_his a, aebk_eih_his b 
                       where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = 'SMSD'
                       and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id and a.ret_ref_no = b.ret_ref_no) x,
                      (select * from aebk_eih_cnts where cnts_nm = 'INTER_ID' and cnts_5 = 'SMSD' and cnts_1 not like 'X%' ) c 
            where 1=1    
            and x.trx_cd (+) = c.cnts_1
        group by c.cnts_1, x.resp_cd
        UNION ALL
        select 'VADP', 'EB1', c.cnts_1, x.resp_cd, count(x.resp_cd) from
                      (select a.trx_cd, b.resp_cd from aebk_eih_his a, aebk_eih_his b 
                       where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = 'VADP'
                       and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id and a.ret_ref_no = b.ret_ref_no ) x,
                      (select * from aebk_eih_cnts where cnts_nm = 'INTER_ID' and cnts_5 = 'VADP' and cnts_1 not like 'X%' ) c 
            where 1=1    
            and x.trx_cd (+) = c.cnts_1
        group by c.cnts_1, x.resp_cd
        ) order by switch, bsns, trx_cd 
       `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.render("layouts/channel2", { data: result, rccust: custrc });
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/channel_detail_chart')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select a.trx_tm, b.trx_cd, b.resp_cd, b.cntt from 
           (select lpad(rownum-1,2,'0') as trx_tm from all_objects 
           where rownum < 25 ) a,
           (select a.trx_cd, substr(a.trx_tm, 0, 2) as trx_tm, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b 
                                     where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = :param1
                                     and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id and a.ret_ref_no = b.ret_ref_no
                                     and a.trx_cd = :param2
                                     and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
                                     group by a.trx_cd, substr(a.trx_tm, 0, 2), b.resp_cd
                                     order by trx_tm asc ) b
           where a.trx_tm = b.trx_tm (+)
           order by a.trx_tm asc 
         `,[req.query.switch, req.query.cd],
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         //console.log(result.rows);
                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/summary_detail_chart')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select a.trx_tm, b.trx_cd, b.resp_cd, b.cntt from 
           (select lpad(rownum-1,2,'0') as trx_tm from all_objects 
           where rownum < 25 ) a,
           (select a.trx_cd, substr(a.trx_tm, 0, 2) as trx_tm, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b 
                                     where a.io_cd = 'I' and a.trx_dt = trunc(sysdate) and a.switch_id = :param1 AND (a.trx_cd NOT IN  ('DUKCALL','PDFMAIL') )
                                     and b.io_cd = 'O' and b.trx_dt (+) = a.trx_dt and a.trc_ad_no = b.trc_ad_no and a.switch_id = b.switch_id and a.ret_ref_no = b.ret_ref_no                                        
                                     and a.bsns_cd != 'ODS' and a.bsns_cd = b.bsns_cd
                                     and a.trx_cd NOT LIKE '%LOG%'
                                     group by a.trx_cd, substr(a.trx_tm, 0, 2), b.resp_cd                   
           UNION ALL
           select a.trx_cd, substr(a.trx_tm, 0, 2) as trx_tm, a.resp_cd, count(1) as cntt from aebk_eoh_his a
           where a.trx_dt = trunc(sysdate) and a.switch_id = :param1 AND (a.trx_cd NOT IN  ('DUKCALL','PDFMAIL') ) 
           and a.trx_cd NOT LIKE '%LOG%'
           group by a.trx_cd, substr(a.trx_tm, 0, 2), a.resp_cd
           ) b
           where a.trx_tm = b.trx_tm (+)
           order by a.trx_tm asc 
         `,[req.query.switch],
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         //console.log(result.rows);
                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/channel_detail')
 .get(function(req, res) {
     if(req.query.cd === undefined || req.query.cd === ''
         ||req.query.switch === undefined || req.query.switch === ''
     ){
         res.render("404");
     }else{
         res.render("layouts/channel_detail", { qswitch: req.query.switch, qcd: req.query.cd })
     }
 });

router.route('/summary_detail')
 .get(function(req, res) {
     if(req.query.switch === undefined || req.query.switch === ''
     ){
         res.render("404");
     }else{
         res.render("layouts/summary_detail", { qswitch: req.query.switch})
     }
 });

router.route('/billpayment_detail')
 .get(function(req, res) {
     if(req.query.prodcd === undefined || req.query.prodcd === ''
     ){
         res.render("404");
     }else{
         res.render("layouts/billpayment_detail", { qprodcd: req.query.prodcd})
     }
 });

router.route('/billpayment_detail_chart')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select a.trx_tm, b.trx_cd, b.resp_cd, b.cntt from 
           (select lpad(rownum-1,2,'0') as trx_tm from all_objects 
           where rownum < 25 ) a,
           (select decode(a.trx_cd,
                                   '0420A01',
                                   'Inquiry',
                                   'NBLLCHK',
                                   'Inquiry',
                                   'NBLLINQ',
                                   'Inquiry',
                                   'Payment/Purchase') as trx_cd,
                            c.cnts_4,
                            substr(a.trx_tm, 0, 2) as trx_tm, b.resp_cd
                            , count(1) as cntt                                                  
                     from aebk_eih_his a,
                          aebk_eih_his b,                
                          (select * from aebk_eih_cnts where cnts_nm = 'PART_CENT_ID') c                 
                     where a.trx_dt = trunc(sysdate)
                     and a.switch_id IN ('VADP', 'SMSD', 'LOCL', 'GIBI', 'ATMD')
                     and a.trx_cd IN
                           ('0420A01', '0520A01', 'NBLLPOS', 'NBLLPAY', 'NBLLINQ', 'NBLLCHK')
                     and a.IO_CD = 'I'
                     and b.IO_CD = 'O'
                     and a.trx_dt (+)= b.trx_dt
                     and a.switch_id = b.switch_id
                     and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no
                     and substr(a.LOG_DATA, 86, 5) = c.cnts_2                        
                     and c.cnts_2 = :param1   
                     group by decode(a.trx_cd,
                                   '0420A01',
                                   'Inquiry',
                                   'NBLLCHK',
                                   'Inquiry',
                                   'NBLLINQ',
                                   'Inquiry',
                                   'Payment/Purchase'), c.cnts_4, substr(a.trx_tm, 0, 2),  b.resp_cd
                     order by trx_tm asc                     
         ) b
           where a.trx_tm = b.trx_tm (+)
         order by a.trx_tm asc 
       `,[req.query.prodcd],
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.send(result);
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/merchant')
 .get(function(req, res) {
     try {
         oracledb.getConnection(
             {
                 user          : "HAPPCHNL",
                 password      : "hachn3029",
                 //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                 // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                 connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
             },
             function(err, connection)
             {
                 if (err) {
                     console.error(err.message);
                     return;
                 }
                 connection.execute(
                     `select 'RNTS' AS Trx_Type, a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'RNTS'
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O' AND a.trx_cd LIKE 'DEBIT%'
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select 'BRSM' AS Trx_Type, a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'BRSM'
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O' AND a.trx_cd LIKE 'DEBIT%'
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select 'VISA LOCAL' AS Trx_Type, a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'ARON'
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O' AND SUBSTR(a.Log_Data,711,2) = 'ID'
         group by a.bsns_cd, b.resp_cd
         UNION ALL
         select 'VISA OVERSEAS' AS Trx_Type, a.bsns_cd, b.resp_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'ARON'
         and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
         and a.IO_CD = 'I' and b.IO_CD = 'O' AND SUBSTR(a.Log_Data,711,2) <> 'ID'
         group by a.bsns_cd, b.resp_cd 
         `,
                     function(err, result)
                     {
                         if (err) {
                             console.error(err.message);
                             doRelease(connection);
                             return;
                         }
                         console.log(result.rows);
                         res.render("layouts/merchant", { data: result, rccust: custrc});
                         doRelease(connection);
                     });
             });
     } catch (e) {
         next(e)
     }
 });

router.route('/merchant_detail')
 .get(function(req, res) {
     if(req.query.switch === undefined || req.query.switch === ''
     ){
         res.render("404");
     }else{
         res.render("layouts/merchant_detail", { qswitch: req.query.switch})
     }
 });

router.route('/merchant_detail_chart')
 .get(function(req, res) {
     try
     {
         console.log(req.query.switch);
         if (req.query.switch === 'RNTS')
         {
             console.log('1');
             oracledb.getConnection(
                 {
                     user          : "HAPPCHNL",
                     password      : "hachn3029",
                     //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                     // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                     connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
                 },
                 function(err, connection)
                 {
                     if (err) {
                         console.error(err.message);
                         return;
                     }
                     connection.execute(
                         ` SELECT a.trx_tm, b.Trx_Type,b.resp_cd,  b.cntt FROM 
        (select lpad(rownum-1,2,'0') as trx_tm from all_objects where rownum < 25 ) a,
        (
        select  'RNTS' AS Trx_Type,substr(a.trx_tm, 0, 2) as trx_tm, b.resp_cd, a.bsns_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'RNTS'
                 and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
                 and a.IO_CD = 'I' and b.IO_CD = 'O' AND a.trx_cd LIKE 'DEBIT%' and b.trx_dt (+) = a.trx_dt
                 group by a.bsns_cd, b.resp_cd, substr(a.trx_tm, 0, 2)
       )
        b
        where a.trx_tm = b.trx_tm (+)
           order by a.trx_tm asc 
                 `,
                         function(err, result)
                         {
                             if (err) {
                                 console.error(err.message);
                                 doRelease(connection);
                                 return;
                             }
                             //console.log(result.rows);
                             res.send(result);
                             doRelease(connection);
                         });
                 });
         }
         else if (req.query.switch === 'BRSM')
         {
             console.log('2');
             oracledb.getConnection(
                 {
                     user          : "HAPPCHNL",
                     password      : "hachn3029",
                     //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                     // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                     connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
                 },
                 function(err, connection)
                 {
                     if (err) {
                         console.error(err.message);
                         return;
                     }
                     connection.execute(
                         ` SELECT a.trx_tm, b.Trx_Type,  b.resp_cd,b.cntt FROM 
        (select lpad(rownum-1,2,'0') as trx_tm from all_objects where rownum < 25 ) a,
        (
        select   'BRSM' AS Trx_Type, substr(a.trx_tm, 0, 2) as trx_tm, b.resp_cd, a.bsns_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'BRSM'
                 and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
                 and a.IO_CD = 'I' and b.IO_CD = 'O' AND a.trx_cd LIKE 'DEBIT%' and b.trx_dt (+) = a.trx_dt
                 group by a.bsns_cd, b.resp_cd, substr(a.trx_tm, 0, 2)
       )
        b
        where a.trx_tm = b.trx_tm (+)
           order by a.trx_tm asc 
                 `,
                         function(err, result)
                         {
                             if (err) {
                                 console.error(err.message);
                                 doRelease(connection);
                                 return;
                             }
                             //console.log(result.rows);
                             res.send(result);
                             doRelease(connection);
                         });
                 });
         }


         else if (req.query.switch === 'VISA LOCAL')
         {
             console.log('3');
             oracledb.getConnection(
                 {
                     user          : "HAPPCHNL",
                     password      : "hachn3029",
                     //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                     // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                     connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
                 },
                 function(err, connection)
                 {
                     if (err) {
                         console.error(err.message);
                         return;
                     }
                     connection.execute(
                         ` SELECT a.trx_tm, b.Trx_Type, b.resp_cd, b.cntt FROM 
        (select lpad(rownum-1,2,'0') as trx_tm from all_objects where rownum < 25 ) a,
        (
        select   'VISA LOCAL' AS Trx_Type, substr(a.trx_tm, 0, 2) as trx_tm, b.resp_cd,a.bsns_cd, count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'ARON'
                 and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
                 and a.IO_CD = 'I' and b.IO_CD = 'O' AND SUBSTR(a.Log_Data,711,2) = 'ID' and b.trx_dt (+) = a.trx_dt
                 group by a.bsns_cd, b.resp_cd, substr(a.trx_tm, 0, 2)
       )
        b
        where a.trx_tm = b.trx_tm (+)
           order by a.trx_tm asc 
                 `,
                         function(err, result)
                         {
                             if (err) {
                                 console.error(err.message);
                                 doRelease(connection);
                                 return;
                             }
                             //console.log(result.rows);
                             res.send(result);
                             doRelease(connection);
                         });
                 });
         }
         else if (req.query.switch === 'VISA OVERSEAS')
         {
             console.log('4');
             oracledb.getConnection(
                 {
                     user          : "HAPPCHNL",
                     password      : "hachn3029",
                     //connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.41)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID4)))"
                     // connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=1521)))(CONNECT_DATA=(SERVICE_NAME=DBHNID1)(SRVR=DEDICATED)))"
                     connectString : "(DESCRIPTION=(ADDRESS_LIST=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.87.30)(PORT=13042)))(CONNECT_DATA=(SERVICE_NAME=DB19HNID1)(SRVR=DEDICATED)))"
                 },
                 function(err, connection)
                 {
                     if (err) {
                         console.error(err.message);
                         return;
                     }
                     connection.execute(
                         ` SELECT a.trx_tm, b.Trx_Type,b.resp_cd,  b.cntt FROM 
        (select lpad(rownum-1,2,'0') as trx_tm from all_objects where rownum < 25 ) a,
        (
       select   'VISA OVERSEAS' AS Trx_Type, substr(a.trx_tm, 0, 2) as trx_tm,  b.resp_cd, a.bsns_cd,count(1) as cntt from aebk_eih_his a, aebk_eih_his b where a.trx_dt = trunc(sysdate) and a.switch_id = 'ARON'
                 and a.trx_dt = b.trx_dt and a.switch_id = b.switch_id and a.trc_ad_no = b.trc_ad_no and a.ret_ref_no = b.ret_ref_no and a.bsns_cd = b.bsns_cd
                 and a.IO_CD = 'I' and b.IO_CD = 'O' and b.trx_dt (+) = a.trx_dt AND SUBSTR(a.Log_Data,711,2) <> 'ID'
                 group by a.bsns_cd, b.resp_cd , substr(a.trx_tm, 0, 2)
       )
        b
        where a.trx_tm = b.trx_tm (+)
           order by a.trx_tm asc 
                 `,
                         function(err, result)
                         {
                             if (err) {
                                 console.error(err.message);
                                 doRelease(connection);
                                 return;
                             }
                             //console.log(result.rows);
                             res.send(result);
                             doRelease(connection);
                         });
                 });
         }

     } catch (e) {
         next(e)
     }
 });


http.createServer(app).listen(app.get('port'), function(){
 console.log("Express server listening on port " + app.get('port'));
});

function doRelease(connection)
{
 connection.close(
     function(err) {
         if (err)
             console.error(err.message);
     });
}