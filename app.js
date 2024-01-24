//2022-07-31T00:00:00.000Z
const express = require("express");
// var moment = require("moment");
const request = require('request');
const fs = require('fs');
const Q = require('q');
//var cors = require('cors');

const app = express();
const port = process.env.PORT || 7000;
/* const corsOptions = {
	origin: function(origin, callback){
		const originIsWhitelisted = whitelist.indexOf(origin) !== -1;
		callback(null, originIsWhitelisted);
	}
} */

app.listen(port, function(err){
	console.log("running server on port "+ port);
});

app.use(express.static('public'));

app.get('/', function(req, res){
    res.send('hello wind-js-server.. <br>go to /latest for wind data..<br> ');
});

app.get('/alive', function(req, res){
	res.send('wind-js-server is alive');
});

app.get('/latest', function(req, res){

	/**
	 * Find and return the latest available 6 hourly pre-parsed JSON data for wind
	 *
	 * @param targetMoment {Object} UTC moment
	 */
	function sendLatest(){
		var fileName = __dirname +"/json-data/wind.json"
		res.setHeader('Content-Type', 'application/json');
		res.sendFile(fileName, {}, function (err) {
			if (err) {
				console.log('latest doesnt exist yet, trying previous interval..');
			}
		});
	}
	run();
	sendLatest();
});

app.get('/nearest', function(req, res, next){
	var time = req.query.timeIso;
	var limit = req.query.searchLimit;
	var searchForwards = false;

	/**
	 * Find and return the nearest available 6 hourly pre-parsed JSON data
	 * If limit provided, searches backwards to limit, then forwards to limit before failing.
	 *
	 * @param targetMoment {Object} UTC moment
	 */
	function sendNearestTo(){
		const fileName = __dirname +"/json-data/wind.json";

		res.setHeader('Content-Type', 'application/json');
		res.sendFile(fileName, {}, function (err) {});
	}
	run();
	sendNearestTo();
});

/**
 *
 * @param targetMoment {Object} moment to check for new data
 */
function run(){
    console.log("run");
    /* get wind data from noaa */
	getWindGribData().then(function(response){
		if(response.stamp){
			convertWindGribToJson(response.stamp, response.epoch);
		}
	});
}

/**
 *
 * Finds and returns the latest 6 hourly wind GRIB2 data from NOAAA
 *
 * @returns {*|promise}
 */
function getWindGribData(){
	let windRetries = 0;
	// var wxRetries = 0;
	const epoch = new Date().getTime().toString();
	const date = new Date();
	const hour = date.getUTCHours();
	const month = date.getUTCMonth() + 1;
	const year = date.getUTCFullYear();
	const day = date.getUTCDate();
	let roundedHour = '';
	let newMonth = ''
	let newDay = ''
	if (hour >= 0 && hour < 6 ){
		roundedHour = '00';
	} else if (hour >= 6 && hour < 12 ){
		roundedHour = '06';
	} else if (hour >= 12 && hour < 18 ){
		roundedHour = '12';
	} else if (hour >= 18 ){
		roundedHour = '18';
	}

	if (month > 0 || month <= 9 ){
		newMonth = '0'+month.toString();
	} else {
		newMonth = month.toString();
	}

	if (day >= 0 && day <= 9 ){
		newDay = '0'+day.toString();
	} else {
		newDay = day.toString();
	}

	const deferred = Q.defer();

	function runQuery(day, hour, month, year, stamp, roundedHour){
		request.get({
			url: 'https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_1p00.pl?file=gfs.t'+roundedHour+'z.pgrb2.1p00.f000&lev_10_m_above_ground=on&lev_mean_sea_level=on&lev_surface=on&var_PRMSL=on&var_TMP=on&var_UGRD=on&var_VGRD=on&leftlon=0&rightlon=360&toplat=90&bottomlat=-90&dir=%2Fgfs.'+stamp + '%2F'+ roundedHour +'%2Fatmos',
		}).on('error', function(err){
			console.log('get wind err 1: '+err);
			windRetries= windRetries +1;
			if (windRetries <= 5){
				if (roundedHour =='00'){
					roundedHour='18';
					day = day - 1;
					if (day == 0 ){
						if(month == 2 || month==4 || month==11 || month==1 || month==4 || month==6 || month==9){
							newDay = '31';
							day=31;
						}else if (month == 3 ){
							newDay = '28';
							day=28;
						}else if (month == 5 || month==7 || month==10 || month==12 ){
							newDay = '30';
							day=30;
						}
						let nMonth = month -1;
						if(nMonth.toString().length==1) { 
							if(nMonth == 0){
								nMonth = 12;
								newMonth = '12';
								year = year -1;
							} else {
								newMonth='0'+nMonth.toString()
							}
						};
					} else{
						if(month.toString().length==1) { 
							newMonth='0'+ month
						}else{
							newMonth=month.toString();
						};
						if(day.toString().length ==1){
							newDay = '0'+day.toString();
						}else{
							newDay = day.toString();
						}
					}
				} else if(roundedHour =='06'){roundedHour='00'}
				else if(roundedHour =='12'){roundedHour='06'}
				else if(roundedHour =='18'){roundedHour='12'}
				stamp =  year.toString()+newMonth+newDay;
				runQuery(day, hour, month, year, stamp, roundedHour);
			} else {
				console.log('Could not get wind');
			}
		}).on('response', function(response) {
			let nMonth = month;
			let newMonth = month.toString()
			if(response.statusCode != 200){
				windRetries= windRetries +1;
				if (windRetries <= 5){
					if (roundedHour =='00'){
						roundedHour='18';
						day = day - 1;
						if (day == 0 ){
							if(month == 2 || month==4 || month==11 || month==1 || month==4 || month==6 || month==9){
								newDay = '31';
								day=31;
							}else if (month == 3 ){
								newDay = '28';
								day=28;
							}else if (month == 5 || month==7 || month==10 || month==12 ){
								newDay = '30';
								day=30;
							}
							nMonth = month -1;
							if(nMonth.toString().length==1) { 
								if(nMonth == 0){
									nMonth = 12;
									newMonth = '12';
									year = year -1;
								} else {
									newMonth='0'+nMonth.toString()
								}
							}
						} else{
							if(month.toString().length==1) { 
								console.log('adding a 0');
								newMonth='0'+month
							}else{
								newMonth=month.toString();
							};
							if(day.toString().length ==1){
								newDay = '0'+day.toString();
							}else{
								newDay = day.toString();
							}
						}
						stamp =  year.toString()+newMonth+newDay;
					} else if(roundedHour =='06'){roundedHour='00'}
					else if(roundedHour =='12'){roundedHour='06'}
					else if(roundedHour =='18'){roundedHour='12'}
					stamp =  year.toString()+newMonth+newDay;
					runQuery(day, hour, month, year, stamp, roundedHour);
				} else {
					console.log('Could not get wind');
				}
			}
			else {
				if(!checkPath('json-data/'+ stamp +'.json', false)) {
					// mk sure we've got somewhere to put output
					checkPath('grib-data', true);
					// pipe the file, resolve the valid time stamp
					const file = fs.createWriteStream(`grib-data/wind.f000`);
					response.pipe(file);
					file.on('finish', function() {
						file.close();
						deferred.resolve({stamp: stamp, targetMoment: epoch});
					});

				}
				else {
					deferred.resolve({stamp: false, targetMoment: false});
				}
			}
		});

	}

	runQuery(day, hour, month, year, stamp, roundedHour);
	return deferred.promise;
}

function convertWindGribToJson(){
	// mk sure we've got somewhere to put output
	checkPath('json-data', true);

	const exec = require('child_process').exec;
	const x = `converter/bin/grib2json --data --output json-data/wind.json --names --compact grib-data/wind.f000`;
	child = exec(x,
		{maxBuffer: 500*1024},
		function (error, stdout, stderr){
			if(error){
				console.log('exec error: ' + error);
			} else {
				console.log("converted..");
			}
		});
}

/**
 * Sync check if path or file exists
 *
 * @param path {string}
 * @param mkdir {boolean} create dir if doesn't exist
 * @returns {boolean}
 */
function checkPath(path, mkdir) {
    try {
	    fs.statSync(path);
	    return true;

    } catch(e) {
        if(mkdir){
	        fs.mkdirSync(path);
        }
	    return false;
    }
}

run();