// We need to import the CSS so that webpack will load it.
// The MiniCssExtractPlugin is used to separate it out into
// its own CSS file.
import "../css/app.scss"

// webpack automatically bundles all modules in your
// entry points. Those entry points can be configured
// in "webpack.config.js".
//
// Import deps with the dep name or local files with a relative path, for example:
//
//     import {Socket} from "phoenix"
//     import socket from "./socket"
//
import "phoenix_html"

import channel from "./socket";

window.onload = function () {
    const connectButton = document.getElementById('connect');
    const callButton = document.getElementById('call');
    const disconnectButton = document.getElementById('disconnect');

    const remoteVideo = document.getElementById('remote-stream');
    const localVideo = document.getElementById('local-stream');

    let peerConnection;
    let remoteStream = new MediaStream();

    setVideoStream(remoteVideo, remoteStream);

    disconnect.disabled = true;
    call.disabled = true;
    connectButton.onclick = connect;
    callButton.onclick = call;
    disconnectButton.onclick = disconnect;


    const reportError = where => error => {
        console.error(where, error)
    }

    function log() {
        console.log(...arguments)
    }

    function setVideoStream(videoElement, stream) {
        if ("srcObject" in videoElement) {
            videoElement.srcObject = stream;
        } else {
            videoElement.src = window.URL.createObjectURL(stream);
        }
    }

    function unsetVideoStream(videoElement) {
        if (videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop())
        }
        videoElement.removeAttribute('src');
        videoElement.removeAttribute('srcObject');
    }

    // function connect() {
    //     console.log("entered connect");
    //     connectButton.disabled = true;
    //     disconnectButton.disabled = false;
    //     callButton.disabled = false;
    //     // separate out the media constraints object passed into the getUserMedia method later
    //     let constraintObj = { 
    //         audio: false, 
    //         video: true
    //     }; 
    //     if (navigator.mediaDevices === undefined) {
    //         navigator.mediaDevices = {};
    //         navigator.mediaDevices.getUserMedia = function(constraintObj) {
    //             let getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
    //             if (!getUserMedia) {
    //                 return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
    //             }
    //             return new Promise(function(resolve, reject) {
    //                 getUserMedia.call(navigator, constraintObj, resolve, reject);
    //             });
    //         }
    //     }else{
    //         navigator.mediaDevices.enumerateDevices()
    //         .then(devices => {
    //             devices.forEach(device=>{
    //                 console.log(device.kind.toUpperCase(), device.label);
    //                 //, device.deviceId
    //             })
    //         })
    //         .catch(err=>{
    //             console.log(err.name, err.message);
    //         })
    //     }
    //     navigator.mediaDevices.getUserMedia(constraintObj)
    //     .then(function(mediaStreamObj) {
    //         setVideoStream(localVideo, mediaStreamObj);
    //     })
    //     .catch(function(err) { 
    //         console.log(err.name, err.message); 
    //     });
    //   }

    async function connect() {
        log('entered connect')
        connectButton.disabled = true;
        disconnectButton.disabled = false;
        callButton.disabled = false;
        const localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
        });
        log('viceo allowed')
        setVideoStream(localVideo, localStream);
        peerConnection = createPeerConnection(localStream);
    }

    function disconnect() {
        connectButton.disabled = false;
        disconnectButton.disabled = true;
        callButton.disabled = true;
        unsetVideoStream(localVideo);
        unsetVideoStream(remoteVideo);
        peerConnection.close();
        peerConnection = null;
        remoteStream = new MediaStream();
        setVideoStream(remoteVideo, remoteStream);
        pushPeerMessage('disconnect', {});
    }
    function createPeerConnection(stream) {
        log('creating Peer conection')
        let pc = new RTCPeerConnection({
            iceServers: [
                // Information about ICE servers - Use your own!
                {
                    urls: 'stun:stun.stunprotocol.org',
                },
            ],
        });
        pc.ontrack = handleOnTrack;
        pc.onicecandidate = handleIceCandidate;
        stream.getTracks().forEach(track => pc.addTrack(track));
        return pc;
    }

    async function call() {
        let offer = await peerConnection.createOffer();
        peerConnection.setLocalDescription(offer);
        pushPeerMessage('video-offer', offer);
    }

    function pushPeerMessage(type, content) {
        // log('Pushing peer msg', type, content)
        channel.push('peer-message', {
            body: JSON.stringify({
                type,
                content
            }),
        });
    }
    function handleOnTrack(event) {
        log('handle on track', event);
        remoteStream.addTrack(event.track);
    }

    function handleIceCandidate(event) {
        if (!!event.candidate) {
            pushPeerMessage('ice-candidate', event.candidate);
        }
    }
    function receiveRemote(offer) {
        let remoteDescription = new RTCSessionDescription(offer);
        peerConnection.setRemoteDescription(remoteDescription);
    }

    async function answerCall(offer) {
        receiveRemote(offer);
        let answer = await peerConnection.createAnswer();
        peerConnection
            .setLocalDescription(answer)
            .then(() =>
                pushPeerMessage('video-answer', peerConnection.localDescription)
            );
    }

    channel.on('peer-message', payload => {
        const message = JSON.parse(payload.body);
        switch (message.type) {
            case 'video-offer':
                log('offered: ', message.content);
                answerCall(message.content);
                break;
            case 'video-answer':
                log('answered: ', message.content);
                receiveRemote(message.content);
                break;
            case 'ice-candidate':
                log('candidate: ', message.content);
                let candidate = new RTCIceCandidate(message.content);
                peerConnection.addIceCandidate(candidate).catch(reportError);
                break;
            case 'disconnect':
                disconnect();
                break;
            default:
                reportError('unhandled message type')(message.type);
        }
    });
};
