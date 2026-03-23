/****  Midi JS ****/

console.log('start');
var audioContext = null;
var player = null;
var reverberator = null;
var songStart = 0;
var input = null;
var currentSongTime = 0;
var nextStepTime = 0;
var nextPositionTime = 0;
var loadedsong = null;




function go() {
    document.getElementById('percent').innerHTML = 'starting...';
    try {
        startPlay(loadedsong);
        document.getElementById('percent').innerHTML = '재생..';
    } catch (expt) {
        document.getElementById('percent').innerHTML = 'error ' + expt;
    }
}

function startPlay(song) {
    currentSongTime = 0;
    songStart = audioContext.currentTime;
    nextStepTime = audioContext.currentTime;
    var stepDuration = 44 / 1000;
    tick(song, stepDuration);
}

function tick(song, stepDuration) {
	
	
	
    if (audioContext.currentTime > nextStepTime - stepDuration) {
	    
        sendNotes(song, songStart, currentSongTime, currentSongTime + stepDuration, audioContext, input, player);
        currentSongTime = currentSongTime + stepDuration;
        nextStepTime = nextStepTime + stepDuration;
	    
        if (currentSongTime > (song.duration + 0.5)) { // 끝날때 0.5초 여유롭게
		
			console.log("song.duration : " + song.duration);		
			console.log("currentSongTime : " + currentSongTime);
			console.log("end of this song");

		return false;		
		
            //currentSongTime = currentSongTime - song.duration;
	    //songStart = songStart + song.duration;
            //sendNotes(song, songStart, 0, currentSongTime, audioContext, input, player);
            
        }
    }
    if (nextPositionTime < audioContext.currentTime) {
        var o = document.getElementById('position');
        o.value = 100 * currentSongTime / song.duration;
        document.getElementById('percent').innerHTML = '' + Math.round(100 * currentSongTime / song.duration) + '%';
        nextPositionTime = audioContext.currentTime + 3;
	    
	    
    }
    window.requestAnimationFrame(function(t) {
        tick(song, stepDuration);
    });
}

function sendNotes(song, songStart, start, end, audioContext, input, player) {
    for (var t = 0; t < song.tracks.length; t++) {
        var track = song.tracks[t];
        for (var i = 0; i < track.notes.length; i++) {
            if (track.notes[i].when >= start && track.notes[i].when < end) {
                var when = songStart + track.notes[i].when;
                var duration = track.notes[i].duration;
                if (duration > 3) {
                    duration = 3;
                }
                var instr = track.info.variable;
                var v = track.volume / 7;
                player.queueWaveTable(audioContext, input, window[instr], when, track.notes[i].pitch, duration, v, track.notes[i].slides);
            }
        }
    }
    for (var b = 0; b < song.beats.length; b++) {
        var beat = song.beats[b];
        for (var i = 0; i < beat.notes.length; i++) {
            if (beat.notes[i].when >= start && beat.notes[i].when < end) {
                var when = songStart + beat.notes[i].when;
                var duration = 1.5;
                var instr = beat.info.variable;
                var v = beat.volume / 2;
                player.queueWaveTable(audioContext, input, window[instr], when, beat.n, duration, v);
            }
        }
    }
}

function startLoad(song) {
    console.log(song);
    // iOS 핵심 수정:
    // reverberator/input 오디오 그래프 설정은 비동기 콜백에서 하면 iOS에서 소리 안남.
    // → play 버튼 클릭(사용자 제스처) 시점으로 이동.
    // 여기서는 악기 파일 프리로딩만 수행.
    var AudioContextFunc = window.AudioContext || window.webkitAudioContext;
    if (!audioContext || audioContext.state === 'closed') {
        audioContext = new AudioContextFunc();
    }
    player = new WebAudioFontPlayer();
    for (var i = 0; i < song.tracks.length; i++) {
        var nn = player.loader.findInstrument(song.tracks[i].program);
        var info = player.loader.instrumentInfo(nn);
        song.tracks[i].info = info;
        song.tracks[i].id = nn;
        player.loader.startLoad(audioContext, info.url, info.variable);
    }
    for (var i = 0; i < song.beats.length; i++) {
        var nn = player.loader.findDrum(song.beats[i].n);
        var info = player.loader.drumInfo(nn);
        song.beats[i].info = info;
        song.beats[i].id = nn;
        player.loader.startLoad(audioContext, info.url, info.variable);
    }
    player.loader.waitLoad(function() {
        console.log('buildControls');
        buildControls(song);
    });
}

function buildControls(song) {
    // resume/오디오 그래프 설정은 startBtn.onclick(사용자 제스처)에서 처리
    var o = document.getElementById('cntls');
    var isMobile = window.innerWidth < 760;
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    var html = '<div class="badge bg-secondary me-1"><i class="bi bi-volume-up-fill"></i> 미디 음원 듣기</div>';

    // ── iOS 안내 메시지 ──
    if (isIOS) {
        html = html + '<div class="alert alert-info py-1 px-2 small" style="margin:0.3em 0;"><i class="bi bi-info-circle-fill"></i> 재생 버튼을 눌러 오디오를 활성화하세요.</div>';
    }

    html = html + '<button class="btn btn-success btn-sm" id="go"><i class="bi bi-play-fill"></i></button>';
    html = html + '<button class="btn btn-secondary btn-sm" id="suspend"><i class="bi bi-pause-fill"></i></button>';
    html = html + '<button class="btn btn-danger btn-sm" id="stop"><i class="bi bi-stop-fill"></i></button>';
    html = html + '<div style="display:inline-flex;align-items:center;width:100%;margin-top:0.4em"><i class="bi bi-sliders"></i><input style="width:100%;margin:0 0.4em" id="position" type="range" min="0" max="100" value="0" step="1" /><span id="percent"></span></div>';

    // ── 모바일: 악기/볼륨 설정을 고급 설정 토글로 숨김 ──
    var advancedStyle = isMobile ? ' style="display:none"' : '';
    html = html + '<div id="advanced-controls"' + advancedStyle + '>';
    html = html + '<div style="margin-top:0.4em">악기선택</div>';
    for (var i = 0; i < song.tracks.length; i++) {
        var v = 100 * song.tracks[i].volume;
        html = html + '<div style="width:100%">' + chooserIns(song.tracks[i].id, i) + '<span class="badge bg-secondary me-1">볼륨</span><input id="channel' + i + '" type="range" min="0" max="100" value="' + v + '" step="1" /></div>';
    }
    for (var i = 0; i < song.beats.length; i++) {
        var v = 100 * song.beats[i].volume;
        html = html + '<div>' + chooserDrum(song.beats[i].id, i) + '<i class="bi bi-volume-up-fill"> </i><input id="drum' + i + '" type="range" min="0" max="100" value="' + v + '" step="1" /></div>';
    }
    html = html + '</div>'; // #advanced-controls 끝

    if (isMobile) {
        html = html + '<button class="btn btn-outline-secondary btn-sm" id="toggleAdvanced" style="margin-top:0.5em"><i class="bi bi-gear-fill"></i> 고급 설정</button>';
    }

    o.innerHTML = html;

    // ── 모바일 고급 설정 토글 이벤트 ──
    if (isMobile) {
        document.getElementById('toggleAdvanced').addEventListener('click', function() {
            var adv = document.getElementById('advanced-controls');
            if (adv.style.display === 'none') {
                adv.style.display = '';
                this.innerHTML = '<i class="bi bi-gear-fill"></i> 고급 설정 닫기';
            } else {
                adv.style.display = 'none';
                this.innerHTML = '<i class="bi bi-gear-fill"></i> 고급 설정';
            }
        });
    }
    console.log('Loaded');
    var pos = document.getElementById('position');
    pos.oninput = function(e) {
        if (loadedsong) {
            player.cancelQueue(audioContext);
            var next = song.duration * pos.value / 100;
            songStart = songStart - (next - currentSongTime);
            currentSongTime = next;
        }
    };
    console.log('Tracks');
    for (var i = 0; i < song.tracks.length; i++) {
        setVolumeAction(i, song);
    }
    console.log('Drums');
    for (var i = 0; i < song.beats.length; i++) {
        setDrVolAction(i, song);
    }
    loadedsong = song;

    // https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/close
    // https://codepen.io/CoolS2/pen/EdPxyz
    // http://grimmdude.com/MidiPlayerJS/
    
	
    var startBtn = document.querySelector("#go");
    var susresBtn = document.querySelector("#suspend");
    var stopBtn = document.querySelector("#stop");


    susresBtn.setAttribute('disabled', 'disabled');
    stopBtn.setAttribute('disabled', 'disabled');

    startBtn.onclick = function() {
        // ── iOS 핵심 수정 ──
        // .then() 콜백은 iOS Safari에서 사용자 제스처로 인식되지 않아 소리가 차단됨.
        // 모든 오디오 그래프 설정과 재생을 onclick 동기 컨텍스트 안에서 수행해야 함.

        // 1) 오디오 그래프 동기 설정 (같은 곡 재play 시 재사용)
        if (!reverberator || !input) {
            reverberator = player.createReverberator(audioContext);
            reverberator.output.connect(audioContext.destination);
            input = reverberator.input;
        }

        // 2) iOS 잠금 해제: 무음 버퍼를 동기적으로 재생
        try {
            var buf = audioContext.createBuffer(1, 1, audioContext.sampleRate);
            var src = audioContext.createBufferSource();
            src.buffer = buf;
            src.connect(audioContext.destination);
            src.start(0);
        } catch (e) {}

        // 3) resume() 호출 — Promise를 기다리지 않고 동기 컨텍스트 유지
        audioContext.resume();

        // 4) 재생 시작
        startBtn.setAttribute('disabled', 'disabled');
        susresBtn.removeAttribute('disabled');
        stopBtn.removeAttribute('disabled');
        go();
    };

    // suspend/resume the audiocontext
    susresBtn.onclick = function() {
        if (audioContext.state === 'running') {
            audioContext.suspend().then(function() {
                susresBtn.innerHTML = '<i class="bi bi-play-fill"></i>' //'RePlay';
            });
        } else if (audioContext.state === 'suspended') {
            audioContext.resume().then(function() {
                susresBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
            });
        }
    }

    // close the audiocontext
    stopBtn.onclick = function() {
	audioContext.suspend().then(function() {
        //audioContext.close().then(function() {
            startBtn.removeAttribute('disabled');
            susresBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
            susresBtn.setAttribute('disabled', 'disabled');
            stopBtn.setAttribute('disabled', 'disabled');
        });
    };

    // add //


}

function setVolumeAction(i, song) {
    var vlm = document.getElementById('channel' + i);
    vlm.oninput = function(e) {
        player.cancelQueue(audioContext);
        var v = vlm.value / 100;
        if (v < 0.000001) {
            v = 0.000001;
        }
        song.tracks[i].volume = v;
    };
    var sl = document.getElementById('selins' + i);
    sl.onchange = function(e) {
        var nn = sl.value;
        var info = player.loader.instrumentInfo(nn);
        player.loader.startLoad(audioContext, info.url, info.variable);
        player.loader.waitLoad(function() {
            console.log('loaded');
            song.tracks[i].info = info;
            song.tracks[i].id = nn;
        });
    };
}

function setDrVolAction(i, song) {
    var vlm = document.getElementById('drum' + i);
    vlm.oninput = function(e) {
        player.cancelQueue(audioContext);
        var v = vlm.value / 100;
        if (v < 0.000001) {
            v = 0.000001;
        }
        song.beats[i].volume = v;
    };
    var sl = document.getElementById('seldrm' + i);
    sl.onchange = function(e) {
        var nn = sl.value;
        var info = player.loader.drumInfo(nn);
        player.loader.startLoad(audioContext, info.url, info.variable);
        player.loader.waitLoad(function() {
            console.log('loaded');
            song.beats[i].info = info;
            song.beats[i].id = nn;
        });
    };
}


function chooserIns(n, track) {
    var html = '<select style="width: 100%;overflow: hidden;text-overflow: ellipsis" class="form-select form-select-sm" id="selins' + track + '">';
    for (var i = 0; i < player.loader.instrumentKeys().length; i++) {
        var sel = '';
        if (i == n) {
            sel = ' selected';
        }
        html = html + '<option value="' + i + '"' + sel + '>' + i + ': ' + player.loader.instrumentInfo(i).title + '</option>';
    }
    html = html + '</select>';
    return html;
}

function chooserDrum(n, beat) {
    var html = '<select style="width: 100%;overflow: hidden;text-overflow: ellipsis" class="form-select form-select-sm" id="seldrm' + beat + '">';
    for (var i = 0; i < player.loader.drumKeys().length; i++) {
        var sel = '';
        if (i == n) {
            sel = ' selected';
        }
        html = html + '<option value="' + i + '"' + sel + '>' + i + ': ' + player.loader.drumInfo(i).title + '</option>';
    }
    html = html + '</select>';
    return html;
}

function handleFileSelect(event) {
    console.log(event);
    // initialize
    if (audioContext !== null) {
        audioContext.close();
    }

    audioContext = null;
    player = null;
    reverberator = null;
    songStart = 0;
    input = null;
    currentSongTime = 0;
    nextStepTime = 0;
    nextPositionTime = 0;
    loadedsong = null;
    // initialize

    var file = event.target.files[0];
    console.log(file);
    var fileReader = new FileReader();
    fileReader.onload = function(progressEvent) {
        console.log(progressEvent);
        var arrayBuffer = progressEvent.target.result;
        console.log(arrayBuffer);
        var midiFile = new MIDIFile(arrayBuffer);
        var song = midiFile.parseSong();
        startLoad(song);
    };
    fileReader.readAsArrayBuffer(file);
}

function handleExample(path) {
    console.log(path);
    // ── 재생 상태 초기화 (audioContext는 main.js에서 관리 — 닫지 않음) ──
    // iOS: audioContext를 close하면 다음 클릭 시 재생 불가. suspend 상태로만 유지.
    if (player !== null) {
        try { player.cancelQueue(audioContext); } catch(e) {}
    }
    // audioContext는 유지 (main.js 클릭 핸들러에서 생성/resume 담당)
    player = null;
    reverberator = null;
    songStart = 0;
    input = null;
    currentSongTime = 0;
    nextStepTime = 0;
    nextPositionTime = 0;
    loadedsong = null;
    // initialize

    var xmlHttpRequest = new XMLHttpRequest();

    //https://mnaoumov.wordpress.com/2018/02/05/download-google-drive-file-via-ajax-ignoring-cors/
    // https://drive.google.com/uc?export=download&id=
    //var addUrl = 'https://cors-anywhere.herokuapp.com/';
    //path = addUrl + path;
    // add end
    xmlHttpRequest.open("GET", path, true);
    xmlHttpRequest.responseType = "arraybuffer";
    xmlHttpRequest.onload = function(e) {
        var arrayBuffer = xmlHttpRequest.response;
        var midiFile = new MIDIFile(arrayBuffer);
        var song = midiFile.parseSong();
        startLoad(song);
    };
    xmlHttpRequest.send(null);
}

// MIDI 파일 업로드 용 코드        
// document.getElementById('filesinput').addEventListener('change', handleFileSelect, false);
/****  Midi JS ****/
