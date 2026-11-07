export function makeSound() {
 let ctx,master,timer,enabled=false,step=0,theme='piano',volume=.4,custom=null,audio;
 const melodies={piano:[261.63,329.63,392,523.25,440,392,329.63,293.66],stars:[196,293.66,392,493.88,440,329.63,246.94,293.66],garden:[293.66,369.99,440,554.37,493.88,440,369.99,329.63]};
 function note(hz,duration,loudness){if(!enabled||!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(loudness,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(master);o.start();o.stop(t+duration+.1);o.onended=()=>{o.disconnect();g.disconnect();};}
 function phrase(){const notes=melodies[theme]||melodies.piano;note(notes[step%8],3,.18);if(step%4===0){note(notes[0]/2,5,.07);note(notes[2]/2,5,.045);}step++;}
 function stop(){clearInterval(timer);audio?.pause();if(master)master.gain.setTargetAtTime(.0001,ctx.currentTime,.08);enabled=false;}
 async function play(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Audio is unavailable in this browser.');ctx??=new AC();await ctx.resume();if(!master){master=ctx.createGain();master.connect(ctx.destination);}enabled=true;master.gain.setTargetAtTime(volume*.6,ctx.currentTime,.1);
 if(theme==='custom'&&custom){audio??=new Audio();audio.src=custom;audio.loop=true;audio.volume=volume;try{await audio.play();}catch(e){stop();throw Error('This audio format could not play. Try an MP3 file.');}}
 else{phrase();timer=setInterval(phrase,theme==='stars'?2400:1800);}return true;}
 return {get enabled(){return enabled;},async toggle(){if(enabled){stop();return false;}return play();},async configure(w){const was=enabled;stop();theme=w.music||'piano';volume=Number(w.volume??.4);custom=w.soundtrack?.data;if(was)await play();},setVolume(n){volume=n;if(master)master.gain.setTargetAtTime(volume*.6,ctx.currentTime,.1);if(audio)audio.volume=n;},chime(){note(659.25,.5,.08);},stop};
}
