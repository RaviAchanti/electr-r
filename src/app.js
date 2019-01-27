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
  document.querySelector('#record-pause').addEventListener('click', PauseRecording)
  document.querySelector('#record-stop').addEventListener('click', stopRecording)
})

const playVideo = () => {
  // remote.dialog.showOpenDialog({properties: ['openFile']}, (filename) => {
  //   console.log(filename)
  //   let video = document.querySelector('video')
  //   video.muted = false
  //   video.src = filename
  // })
}

//After play
const disableButtons = () => {
  document.querySelector('#record-desktop').disabled = true  
  document.querySelector('#record-pause').hidden = false  
  document.querySelector('#record-stop').hidden = false
  document.querySelector('#record-pause').disabled = false
}

const enableAfterPauseButtons = () => {
  document.querySelector('#record-desktop').disabled = false  
  document.querySelector('#record-pause').disabled = true
  document.querySelector('#record-stop').disabled = false
}

//After stop
const enableButtons = () => {
  document.querySelector('#record-desktop').disabled = false  
  document.querySelector('#record-pause').hidden = true
  document.querySelector('#record-stop').hidden = true

}

const microAudioCheck = () => {
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

const recordDesktop = () => {
  ipcRenderer.send('show-picker', { types: ['screen'] })
}

const cleanRecord = () => {  
  if ( drecordedChunks != [])
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


const PauseRecording = () => {
  PauseDesktopRecording();
  PauseMicroPhoneRecording();
  enableAfterPauseButtons()
}

const PauseDesktopRecording = () => {
  console.log('Pausing record and starting download')  
  deskToprecorder.pause()
}

const PauseMicroPhoneRecording = () => {
  console.log('Pausing record and starting download')
  microphonerecorder.pause()
}

const stopRecording = () => {
  stopDesktopRecording();
  stopMicroPhoneRecording();
  enableButtons()
  download()
}

const stopDesktopRecording = () => {
  console.log('Stopping record and starting download')  
  console.log('d');
  console.log(dlocalStream);
  deskToprecorder.stop()
  dlocalStream.getVideoTracks()[0].stop()
}

const stopMicroPhoneRecording = () => {
  console.log('Stopping record and starting download')
  microphonerecorder.stop()
  mlocalStream.getAudioTracks()[0].stop()
}

const play = () => {
  // Unmute video.
  // let video = document.querySelector('video')
  // video.controls = true;
  // video.muted = false
  // let blob = new Blob(recordedChunks, {type: 'video/webm'})
  // video.src = window.URL.createObjectURL(blob)
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
}

const mdownload = () => {
  let blob = new Blob(mrecordedChunks, {type: 'audio/webm'})
  saveBlob(blob);
}

const getMicrophoneStream = (stream) => {

  mlocalStream = stream
  stream.onended = () => { console.log('Media stream ended.') }

  // let videoTracks = mlocalStream.getVideoTracks()

  if (includeMic) {
    console.log('Adding audio track.')
    let audioTracks = microAudioStream.getAudioTracks()
    mlocalStream.addTrack(audioTracks[0])
  }
  try {
    console.log(microphonerecorder)
    console.log('Start recording the microphonerecorder stream.')
    if (!microphonerecorder)
    microphonerecorder = new MediaRecorder(stream)
    microphonerecorder.mimeType = 'audio/webm';
  } catch (e) {
    console.assert(false, 'Exception while creating microphonerecorder MediaRecorder: ' + e)
    return
  }
  microphonerecorder.ondataavailable = recorderOnMicDataAvailable
  microphonerecorder.onresume = () => { console.log('microphonerecorder on Resumed') }
  microphonerecorder.onpause = () => { console.log('microphonerecorder Paused') }
  microphonerecorder.onstop = () => { console.log('microphonerecorder recorderOnStop fired') }
  if (microphonerecorder.state == "paused")
  {
    microphonerecorder.resume()
    console.log('microphonerecorder Resumed')
  }
  else {
    microphonerecorder.start()
    console.log('microphonerecorder is started.')
  }
  disableButtons()
}

const getMediaStream = (stream) => {

  dlocalStream = stream 
  console.log(dlocalStream)


  stream.onended = () => { console.log('Media stream ended.') }
  try {
    console.log(deskToprecorder)
    console.log('Start recording the deskToprecorder stream.')
    if (!deskToprecorder)
    deskToprecorder = new MediaRecorder(stream)
  } catch (e) {
    console.assert(false, 'Exception while creating MediaRecorder: ' + e)
    return
  }
  deskToprecorder.ondataavailable = recorderOnDeskDataAvailable
  deskToprecorder.onresume = () => { console.log('deskToprecorder on  resumed') }
  deskToprecorder.onpause = () => { console.log('deskToprecorder Paused') }
  deskToprecorder.onstop = () => { console.log('deskToprecorder recorderOnStop fired') }

  if (deskToprecorder.state == "paused"){
    deskToprecorder.resume()
    console.log('deskToprecorder resumed')
  }
  else
  {
    deskToprecorder.start()
    console.log('deskToprecorder is started.')
  }
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
      audio: true,
      video: false,
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
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: getMediaStream.id
        }
    }
    ,
      video: { mandatory: { chromeMediaSource: 'desktop', chromeMediaSourceId: id,
        maxWidth: 10, maxHeight: 10} }
 
     },
     getMediaStream, getUserMediaError)
} 

