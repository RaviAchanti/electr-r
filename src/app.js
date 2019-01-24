const {desktopCapturer, ipcRenderer, remote} = require('electron')
const domify = require('domify')

let mlocalStream
let dlocalStream
let microAudioStream
let mrecordedChunks = []
let drecordedChunks = []
let numRecordedChunks = 0
let deskToprecorder
let microphonerecorder
let includeMic = false
// let includeSysAudio = false

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#record-desktop').addEventListener('click', recordDesktop)  
  document.querySelector('#play-video').addEventListener('click', playVideo)
  document.querySelector('#micro-audio').addEventListener('click', microAudioCheck)
  // document.querySelector('#system-audio').addEventListener('click', sysAudioCheck)
  document.querySelector('#record-stop').addEventListener('click', stopRecording)
  document.querySelector('#play-button').addEventListener('click', play)
  document.querySelector('#download-button').addEventListener('click', download)
})

const playVideo = () => {
  remote.dialog.showOpenDialog({properties: ['openFile']}, (filename) => {
    console.log(filename)
    let video = document.querySelector('video')
    video.muted = false
    video.src = filename
  })
}

const disableButtons = () => {
  document.querySelector('#record-desktop').disabled = true  
  document.querySelector('#record-stop').hidden = false
  document.querySelector('#play-button').hidden = true
  document.querySelector('#download-button').hidden = true
}

const enableButtons = () => {
  document.querySelector('#record-desktop').disabled = false  
  document.querySelector('#record-stop').hidden = true
  document.querySelector('#play-button').hidden = true
  document.querySelector('#download-button').hidden = true
}

const microAudioCheck = () => {
  // includeSysAudio = false
  // document.querySelector('#system-audio').checked = false

  // Mute video so we don't play loopback audio.
  var video = document.querySelector('video')
  video.muted = true
  includeMic = !includeMic
  if(includeMic)
    document.querySelector('#micro-audio-btn').classList.add('active');
  else
    document.querySelector('#micro-audio-btn').classList.remove('active');
  console.log('Audio =', includeMic)

  if (includeMic) {
    navigator.webkitGetUserMedia({ audio: true, video: false },
        getMicroAudio, getUserMediaError)
  }
}

const cleanRecord = () => {
  let video = document.querySelector('video');
  video.controls = false;
  drecordedChunks = []
  mrecordedChunks = []  
  numRecordedChunks = 0
}

ipcRenderer.on('source-id-selected', (event, sourceId) => {
  // Users have cancel the picker dialog.
  if (!sourceId) return
  console.log("initiating .. desktop and microphone");
  startDesktopRecording(sourceId)
  startMicrophoneRecording(sourceId)
})

const recordDesktop = () => {
  cleanRecord()
  ipcRenderer.send('show-picker', { types: ['screen'] })
}

const recorderOnMicDataAvailable = (event) => {
  if (event.data && event.data.size > 0) {
    mrecordedChunks.push(event.data)
    numRecordedChunks += event.data.byteLength
  }
}

const recorderOnDeskDataAvailable = (event) => {
  if (event.data && event.data.size > 0) {
    drecordedChunks.push(event.data)
    numRecordedChunks += event.data.byteLength
  }
}


const stopRecording = () => {
  stopDesktopRecording();
  stopMicroPhoneRecording();
  enableButtons()
  document.querySelector('#play-button').hidden = false
  document.querySelector('#download-button').hidden = false

}

const stopDesktopRecording = () => {
  console.log('Stopping record and starting download')  
  deskToprecorder.stop()
  dlocalStream.getVideoTracks()[0].stop()
}

const stopMicroPhoneRecording = () => {
  console.log('Stopping record and starting download')
  microphonerecorder.stop()
  mlocalStream.getVideoTracks()[0].stop()
}

const play = () => {
  // Unmute video.
  let video = document.querySelector('video')
  video.controls = true;
  video.muted = false
  let blob = new Blob(recordedChunks, {type: 'video/webm'})
  video.src = window.URL.createObjectURL(blob)
}

const download = () => {
  ddownload();
  mdownload();
}

ipcRenderer.on('SAVED_FILE', (event, path) => {
  console.log("Saved file " + path)
})

function saveBlob(blob) {
  let reader = new FileReader()
  let file = URL.createObjectURL(blob).toString();
  let fileName = "./" + file.substring(14,file.length)

  reader.onload = function() {
      if (reader.readyState == 2) {
          var buffer = new Buffer(reader.result)
          ipcRenderer.send('SAVE_FILE', fileName, buffer)
          console.log(`Saving ${JSON.stringify({ fileName, size: blob.size })}`)
      }
  }
  reader.readAsArrayBuffer(blob)
}

const ddownload = () => {
  let blob = new Blob(drecordedChunks, {type: 'video/webm'})
  saveBlob(blob);
  // let url = URL.createObjectURL(blob)
  // let a = document.createElement('a')
  // document.body.appendChild(a)
  // a.style = 'display: none'
  // a.href = url
  // a.download = 'electron-screen-recorder-d.webm'
  // a.click()
  // setTimeout(function () {
  //   document.body.removeChild(a)
  //   window.URL.revokeObjectURL(url)
  // }, 100)
}

const mdownload = () => {
  let blob = new Blob(mrecordedChunks, {type: 'video/webm'})
  saveBlob(blob);
  // let url = URL.createObjectURL(blob)
  // let a = document.createElement('a')
  // document.body.appendChild(a)
  // a.style = 'display: none'
  // a.href = url
  // a.download = 'electron-screen-recorder-m.webm'
  // a.click()
  // setTimeout(function () {
  //   document.body.removeChild(a)
  //   window.URL.revokeObjectURL(url)
  // }, 100)
}

const getMicrophoneStream = (stream) => {
  let video = document.querySelector('video')
  video.src = URL.createObjectURL(stream)
  mlocalStream = stream
  stream.onended = () => { console.log('Media stream ended.') }

  let videoTracks = mlocalStream.getVideoTracks()

  if (includeMic) {
    console.log('Adding audio track.')
    let audioTracks = microAudioStream.getAudioTracks()
    mlocalStream.addTrack(audioTracks[0])
  }
  try {
    console.log('Start recording the microphonerecorder stream.')
    microphonerecorder = new MediaRecorder(stream)
  } catch (e) {
    console.assert(false, 'Exception while creating microphonerecorder MediaRecorder: ' + e)
    return
  }
  microphonerecorder.ondataavailable = recorderOnMicDataAvailable
  microphonerecorder.onstop = () => { console.log('microphonerecorder recorderOnStop fired') }
  microphonerecorder.start()
  console.log('microphonerecorder is started.')
  disableButtons()
}

const getMediaStream = (stream) => {
  let video = document.querySelector('video')
  video.src = URL.createObjectURL(stream)
  dlocalStream = stream
  stream.onended = () => { console.log('Media stream ended.') }

  let videoTracks = dlocalStream.getVideoTracks()

  try {
    console.log('Start recording the deskToprecorder stream.')
    deskToprecorder = new MediaRecorder(stream)
  } catch (e) {
    console.assert(false, 'Exception while creating MediaRecorder: ' + e)
    return
  }
  deskToprecorder.ondataavailable = recorderOnDeskDataAvailable
  deskToprecorder.onstop = () => { console.log('deskToprecorder recorderOnStop fired') }
  deskToprecorder.start()
  console.log('deskToprecorder is started.')
  disableButtons()
}

const getMicroAudio = (stream) => {
  console.log('Received audio stream.')
  microAudioStream = stream
  stream.onended = () => { console.log('Micro audio ended.') }
}

const getUserMediaError = () => {
  console.log('getUserMedia() failed.')
}

const startMicrophoneRecording = (id) => {
  if (!id) {
    console.log('Access rejected.')
    return
  }  
    navigator.webkitGetUserMedia({
      audio: false,
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id,
        maxWidth: window.screen.width, maxHeight: window.screen.height } }
    }, getMicrophoneStream, getUserMediaError)
}

const startDesktopRecording = (id) => {
  if (!id) {
    console.log('Access rejected.')
    return
  }  

    navigator.webkitGetUserMedia({
      audio: {
        mandatory: {
            chromeMediaSource: 'system',
            chromeMediaSourceId: getMediaStream.id
        }
    },
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id,
        maxWidth: window.screen.width, maxHeight: window.screen.height } }
    }, getMediaStream, getUserMediaError)
} 

