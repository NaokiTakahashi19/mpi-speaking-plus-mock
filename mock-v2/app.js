(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 /* GRAPHIC_HELPERS */
 const key=document.body.dataset.lesson;
 const lesson=window.MPI_LESSONS[key];
 const state={screen:'intro',phase:'ready',prompt:0,watched:false,stars:3,results:lesson.prompts.map(()=>null),generation:0};
 let recorder=null,stream=null,audio=null,ownUrl=null,clock=null,context=null,meterFrame=null,startTime=0,peak=0,monitored=false;
 let audioGeneration=0, realRecording=false, previewCapture=false;
 const characterAccessory=key==='talk'?'<path class="character-second" d="M42 7h12q7 0 7 7v8q0 6-7 6h-5l-6 4v-7q-5-1-5-6v-7q0-5 4-5Z"/><path d="M44 14h10m-10 5h7"/>':'<path d="M44 42l9-10m0-2v-8m0 8 6-5"/>';
 const typeCharacter='<svg viewBox="0 0 64 64" aria-hidden="true"><path class="character-ground" d="M8 28Q5 8 30 5q28-3 29 26 2 28-25 28Q6 61 8 28Z"/><circle class="character-face" cx="27" cy="26" r="15"/><path d="M14 18q11-14 26 0M14 55V46q0-9 13-9t13 9v8"/><circle class="character-eye" cx="22" cy="25" r="1.5"/><circle class="character-eye" cx="33" cy="25" r="1.5"/><path d="M22 31q5 5 10 0"/>'+characterAccessory+'</svg>';
 document.title=`${lesson.name} 第2案 | mpi英語プログラム`;
 $('app').innerHTML=`<header class="masthead"><div class="header-inner"><img class="logo" src="assets/brand/mpi-logo.png" width="432" height="82" alt="mpi英語プログラム"><div class="lesson-type">${typeCharacter}<strong>${lesson.name}</strong><span>${key==='talk'?'かいわ':'じこしょうかい'}</span></div><span class="lesson-number">${lesson.lesson}</span></div></header>
 <main class="lesson-main"><div class="stage-bar"><div class="stage-name" id="stage-name"></div><div class="stage-caption"><span id="stage-caption"></span><span class="prompt-count" id="prompt-count"></span></div></div><div class="stage-content">
 <section class="intro" id="intro"><figure><img class="intro-poster" id="intro-poster" width="880" height="484" alt="おてほんの動画"></figure><div><h1 class="intro-title" id="intro-title"></h1><p class="intro-meaning" id="intro-meaning"></p>${guide('watch')}<div class="intro-actions"><button class="nav-button primary" id="start">${icon('play')}スタート</button></div></div></section>
 <section class="media-frame" id="media-frame" hidden aria-label="動画"><video id="video" width="880" height="484" playsinline controls preload="metadata"></video><div class="video-cover" id="video-cover"><button class="play-video" id="play-video" aria-label="動画を再生">${icon('play')}</button></div><div class="cue-overlay" id="cue-overlay" hidden></div></section>
 <section class="practice-frame" id="practice-frame" hidden aria-label="会話のれんしゅう"><img class="scene" id="scene" width="720" height="480" alt=""><div class="practice-overlay" id="practice-overlay"></div></section>
 <section class="finished" id="finished" hidden></section></div><div class="status" id="status" aria-live="polite"></div>
 <nav class="nav-row" id="nav-row" aria-label="れんしゅうをすすめる" hidden><button class="nav-button" id="back">${icon('arrow')}もどる</button><button class="nav-button primary" id="next">つぎへ${icon('arrow')}</button></nav>
 <footer class="mock-footer"><span id="mode-label">画面確認モード（マイク不使用）／星は表示サンプル</span><details class="teacher-tools"><summary>画面確認</summary><div><label class="microphone-option"><input type="checkbox" id="use-microphone">実際にマイクで録音する</label><button class="replay-small" id="demo-three">${icon('star')}★3つの表示</button><button class="replay-small" id="demo-one">${icon('star')}★1つの表示</button><button class="replay-small" id="skip-video">動画をスキップ</button></div></details></footer></main>`;
 const video=$('video');video.src=lesson.video;video.poster=lesson.poster;
 $('intro-poster').src=lesson.poster;$('intro-title').textContent=lesson.name+' '+lesson.lesson.replaceAll(' ','');$('intro-meaning').textContent='はつおんのれんしゅうをしましょう。';
 $('start').onclick=()=>{if(key==='talk'){state.screen='watch';state.watched=false;state.phase='ready';video.currentTime=0;render();playVideo();}else{state.screen='practice';state.prompt=0;state.phase='cue';video.currentTime=0;render();playVideo();}};
 $('play-video').onclick=playVideo;
 $('back').onclick=goBack;$('next').onclick=advance;
 $('use-microphone').onchange=()=>{cleanup();revoke();realRecording=$('use-microphone').checked;if(state.screen==='practice'&&['recording','requesting','saving','review'].includes(state.phase))state.phase='ready';render();};
 $('demo-three').onclick=()=>demoResult(3);$('demo-one').onclick=()=>demoResult(1);
 $('skip-video').onclick=()=>{cancelCapture();stopAudio();video.pause();if(state.screen==='intro'){state.screen='practice';state.prompt=0;}if(state.screen==='watch'){state.screen='practice';state.prompt=0;}state.phase='ready';render();};
 video.addEventListener('play',()=>{$('video-cover').hidden=true;});
 video.addEventListener('pause',()=>{$('video-cover').hidden=state.screen==='practice'&&state.phase!=='cue';});
 video.addEventListener('timeupdate',()=>{if(key==='aboutmyself'&&state.screen==='practice'&&state.phase==='cue'&&video.currentTime>=lesson.prompts[state.prompt].pauseAt){video.pause();state.phase='ready';render();}});
 video.addEventListener('ended',()=>{if(state.screen==='watch'){state.watched=true;render();}else if(key==='aboutmyself'&&state.phase==='tail'){finish();}else if(state.phase==='cue'){state.phase='ready';render();}});
 video.addEventListener('error',()=>message('どうがを よみこめませんでした。せんせいに きいてね。',true));
 function message(text='',error=false){$('status').textContent=text;$('status').className=error?'status error':'status';}
 function stopAudio(){audioGeneration++;if(audio){audio.pause();audio=null;}if('speechSynthesis'in window)speechSynthesis.cancel();if($('own-audio'))$('own-audio').pause();const button=$('model')||$('sample-play');if(button)button.disabled=['recording','requesting','saving'].includes(state.phase);}
 function revoke(){if(ownUrl)URL.revokeObjectURL(ownUrl);ownUrl=null;}
 function stopMonitor(){clearInterval(clock);clock=null;cancelAnimationFrame(meterFrame);if(context){context.close().catch(()=>{});context=null;}}
 function release(){if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;}
 function cancelCapture(){state.generation++;previewCapture=false;if(recorder&&recorder.state!=='inactive'){recorder.onstop=null;recorder.stop();}recorder=null;stopMonitor();release();}
 function cleanup(){cancelCapture();stopAudio();video.pause();}
 function bar(name,caption,count=''){ $('stage-name').textContent=name;$('stage-caption').textContent=caption;$('prompt-count').textContent=count; }
 function render(){
  message();$('mode-label').textContent=realRecording?'録音モード／音声判定は未接続・星は表示サンプル':'画面確認モード（マイク不使用）／星は表示サンプル';
  const intro=state.screen==='intro',watch=state.screen==='watch',practice=state.screen==='practice',finished=state.screen==='finish';
  document.querySelector('.masthead').classList.toggle('intro-mode',intro);document.querySelector('.stage-bar').hidden=intro;document.querySelector('.stage-content').classList.toggle('intro-stage',intro);
  $('intro').hidden=!intro;$('media-frame').hidden=!(watch||(practice&&key==='aboutmyself'));$('practice-frame').hidden=!(practice&&key==='talk');$('finished').hidden=!finished;$('nav-row').hidden=intro;
  $('cue-overlay').hidden=true;
  $('next').disabled=false;$('next').innerHTML='つぎへ'+icon('arrow');$('back').disabled=['recording','requesting','saving'].includes(state.phase);
  $('back').innerHTML='<span class="back-arrow">'+icon('arrow')+'</span>もどる';
  if(intro){bar('はじめよう',key==='talk'?'かいわに チャレンジ':'じこしょうかいに チャレンジ');return;}
  if(watch){bar('おてほん','みてみよう');$('video-cover').hidden=!video.paused;$('next').disabled=!state.watched;return;}
  if(finished){bar('きょうの けっか','おつかれさま！');$('back').innerHTML=icon('replay')+'おてほん';$('next').innerHTML=icon('replay')+'もういちど';return;}
  const p=lesson.prompts[state.prompt];
  bar(key==='talk'?'きょうの ことば':'チャレンジ！',state.phase==='review'?'けっかを みよう':state.phase==='cue'||state.phase==='tail'?'みてみよう':p.role,`${state.prompt+1} / ${lesson.prompts.length}`);
  const readyToNext=state.phase==='review';$('next').disabled=!readyToNext;
  if(readyToNext&&state.prompt===lesson.prompts.length-1)$('next').innerHTML='おわる'+icon('check');
  if(key==='aboutmyself'&&(state.phase==='cue'||state.phase==='tail')){$('video-cover').hidden=!video.paused;return;}
  const html=promptMarkup(p);
  if(key==='talk'){$('scene').src=p.image;$('scene').alt=p.meaning;$('practice-overlay').innerHTML=html;}else{$('cue-overlay').hidden=false;$('cue-overlay').innerHTML=html;$('video-cover').hidden=true;}
  bindPrompt();
 }
 function ribbon(stars){return `<div class="rating" aria-label="${stars}つ星の表示サンプル"><span class="sample-tag">評価サンプル</span><div class="ribbon"><span class="ribbon-stars">${[0,1,2].map(i=>`<span class="${i<stars?'lit':'unlit'}">${icon('star')}</span>`).join('')}</span></div><p class="rating-label">${stars===3?'パーフェクト!!':'もういちど！'}</p></div>`;}
 function promptMarkup(p){
  const busy=['recording','requesting','saving'].includes(state.phase);
  const top=`<div class="phrase-block">${p.question?`<p class="question-line">${icon('sound')}<span lang="en">${p.question}</span></p>`:''}<h1 class="phrase" lang="en">${p.text}</h1><p class="translation">${p.meaning}</p>${state.phase!=='review'||ownUrl?`<button class="model-button" id="model" ${busy?'disabled':''}>${icon('sound')}おてほん</button>`:''}</div>`;
  let action='';
  if(state.phase==='recording')action=`<div class="record-line" role="status"><span class="record-dot"></span><span>${previewCapture?'録音画面のサンプル':'きいているよ'}</span><span class="timer" id="timer">0:00</span></div><button class="picture-action stop" id="stop">${icon('stop')}おわった</button>`;
  else if(state.phase==='requesting'||state.phase==='saving')action=`<p role="status">${state.phase==='requesting'?'マイクを じゅんびちゅう…':'ちょっと まってね…'}</p><button class="replay-small" id="cancel">やめる</button>${state.phase==='requesting'?'<button class="replay-small" id="preview-without-mic">マイクなしで画面確認</button>':''}`;
  else if(state.phase==='review')action=`${ribbon(state.stars)}<div class="review-actions">${ownUrl?`<button class="picture-action" id="own">${drawing('listen')}じぶんのこえ</button>`:`<button class="picture-action" id="sample-play">${drawing('listen')}再生サンプル</button>`}<button class="replay-small" id="retry">${icon('replay')}もういちど</button></div>${ownUrl?'<audio class="own-audio" id="own-audio" controls aria-label="じぶんのこえ"></audio>':''}`;
  else action=`<button class="picture-action" id="record" aria-label="マイクをおしてはなす">${drawing('tap')}はなす</button>`;
  return `${top}<div class="action-area">${action}</div>`;
 }
 function bindPrompt(){if($('preview-without-mic'))$('preview-without-mic').onclick=usePreview;if($('sample-play'))$('sample-play').onclick=playModel;if($('record'))$('record').onclick=record;if($('stop'))$('stop').onclick=stopRecording;if($('cancel'))$('cancel').onclick=()=>{cancelCapture();state.phase='ready';render();};if($('retry'))$('retry').onclick=record;if($('model'))$('model').onclick=playModel;if($('own-audio')){$('own-audio').src=ownUrl;$('own-audio').onplay=()=>{if(audio)audio.pause();if('speechSynthesis'in window)speechSynthesis.cancel();};$('own').onclick=()=>{stopAudio();$('own-audio').play().catch(()=>message('もういちど おしてね。',true));};}}
 async function playVideo(){if(['recording','requesting','saving'].includes(state.phase))return;stopAudio();try{await video.play();}catch{message('▶ を もういちど おしてね。',true);}}
 function playFile(src,generation){return new Promise((resolve,reject)=>{if(generation!==audioGeneration)return resolve();audio=new Audio(src);audio.onended=resolve;audio.onerror=reject;audio.play().catch(reject);});}
 async function playModel(){stopAudio();const p=lesson.prompts[state.prompt],generation=audioGeneration;const button=$('model')||$('sample-play');if(button)button.disabled=true;try{if(p.questionAudio)await playFile(p.questionAudio,generation);if(generation!==audioGeneration)return;if(p.audio)await playFile(p.audio,generation);else await new Promise((resolve,reject)=>{if(!('speechSynthesis'in window))return reject();const u=new SpeechSynthesisUtterance(p.spoken);u.lang='en-US';u.rate=.85;const v=speechSynthesis.getVoices().find(v=>v.lang.startsWith('en'));if(v)u.voice=v;u.onend=resolve;u.onerror=reject;speechSynthesis.speak(u);});}catch{if(generation===audioGeneration)message('おてほんを きけませんでした。もういちど おしてね。',true);}finally{if(generation===audioGeneration){const current=$('model')||$('sample-play');if(current)current.disabled=false;}}}
 function monitor(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;context=new C();context.resume().catch(()=>{});const analyser=context.createAnalyser();analyser.fftSize=1024;context.createMediaStreamSource(stream).connect(analyser);const data=new Uint8Array(1024);const tick=()=>{if(!context||!stream)return;analyser.getByteTimeDomainData(data);let sum=0;for(const x of data)sum+=((x-128)/128)**2;peak=Math.max(peak,Math.sqrt(sum/data.length));if(context.state==='running')monitored=true;meterFrame=requestAnimationFrame(tick);};tick();}catch{stopMonitor();}}
 async function record(){
  cleanup();revoke();const generation=state.generation;
  if(!realRecording){previewCapture=true;state.phase='recording';startTime=Date.now();render();clock=setInterval(()=>{const t=Math.floor((Date.now()-startTime)/1000);if($('timer'))$('timer').textContent='0:'+String(t).padStart(2,'0');if(t>=30)stopRecording();},250);return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){state.phase='ready';render();message('マイクが つかえません。',true);offerPreview();return;}
  state.phase='requesting';render();
  try{const candidate=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});if(generation!==state.generation){candidate.getTracks().forEach(t=>t.stop());return;}stream=candidate;
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));const capture=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);recorder=capture;const chunks=[];peak=0;monitored=false;
   capture.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   capture.onerror=()=>{if(generation!==state.generation)return;cancelCapture();state.phase='ready';render();message('ろくおんが とまりました。もういちど おしてね。',true);};
   capture.onstop=()=>{stopMonitor();release();recorder=null;if(generation!==state.generation)return;const duration=(Date.now()-startTime)/1000;const blob=new Blob(chunks,{type:capture.mimeType||mime||'audio/webm'});if(blob.size<100||duration<.5||(monitored&&peak<.003)){state.phase='ready';render();message('こえが きこえなかったよ。もういちど はなしてね。',true);return;}ownUrl=URL.createObjectURL(blob);state.phase='review';render();};
   capture.start();startTime=Date.now();state.phase='recording';render();monitor();clock=setInterval(()=>{const t=Math.floor((Date.now()-startTime)/1000);if($('timer'))$('timer').textContent='0:'+String(t).padStart(2,'0');if(t>=30)stopRecording();},250);
   stream.getAudioTracks().forEach(t=>t.addEventListener('ended',()=>{if(recorder?.state==='recording')stopRecording();}));
  }catch(e){if(generation!==state.generation)return;stopMonitor();release();recorder=null;state.phase='ready';render();message(e.name==='NotAllowedError'?'マイクを「きょか」にしてね。せんせいに きいてね。':'マイクが つかえません。せんせいに きいてね。',true);offerPreview();}
 }
 function usePreview(){realRecording=false;$('use-microphone').checked=false;record();}
 function offerPreview(){const button=document.createElement('button');button.type='button';button.className='replay-small';button.id='preview-after-error';button.textContent='マイクなしで画面を確認する';button.onclick=usePreview;$('status').append(document.createElement('br'),button);}
 function stopRecording(){if(previewCapture){previewCapture=false;stopMonitor();state.phase='review';render();return;}if(recorder?.state!=='recording')return;state.phase='saving';clearInterval(clock);recorder.stop();render();}
 function demoResult(stars){cleanup();revoke();if(state.screen!=='practice'){state.screen='practice';state.prompt=0;}state.stars=stars;state.phase='review';if(key==='aboutmyself')video.currentTime=lesson.prompts[state.prompt].pauseAt;render();}
 function advance(){if(state.screen==='watch'){cleanup();state.screen='practice';state.phase='ready';state.prompt=0;render();return;}if(state.screen==='finish'){cleanup();revoke();state.results=lesson.prompts.map(()=>null);state.prompt=0;state.phase='ready';state.screen='intro';render();return;}if(state.screen!=='practice'||state.phase!=='review')return;
  state.results[state.prompt]={recorded:!!ownUrl,stars:state.stars};cleanup();revoke();
  if(state.prompt<lesson.prompts.length-1){const lastPause=lesson.prompts[state.prompt].pauseAt;state.prompt++;state.phase=key==='aboutmyself'?'cue':'ready';if(key==='aboutmyself')video.currentTime=lastPause;render();if(key==='aboutmyself')playVideo();}
  else if(key==='aboutmyself'){state.phase='tail';video.currentTime=lesson.prompts[state.prompt].pauseAt;render();playVideo();}else finish();
 }
 function finish(){cleanup();state.screen='finish';state.phase='ready';$('finished').innerHTML=`<div class="finish-title">${icon('star')}<h1 lang="en">You did it!</h1></div><ul class="finish-list">${lesson.prompts.map((p,i)=>`<li><span class="phrase" lang="en">${p.text}</span><span class="summary-stars" aria-label="${state.results[i]?.stars||3}つ星の表示サンプル">${[0,1,2].map(n=>`<span class="${n<(state.results[i]?.stars||3)?'lit':'unlit'}">${icon('star')}</span>`).join('')}</span><span class="done-label">${state.results[i]?.recorded?'ろくおん したよ':'表示サンプル'}</span></li>`).join('')}</ul><p class="summary-note">星は表示サンプルです。音声の判定はまだ行っていません。</p>`;render();}
 function goBack(){cleanup();revoke();if(state.screen==='finish'){state.screen='intro';state.phase='ready';render();return;}if(state.screen==='watch'){state.screen='intro';render();return;}if(state.prompt>0){state.prompt--;state.phase=key==='aboutmyself'?'cue':'ready';if(key==='aboutmyself')video.currentTime=lesson.prompts[state.prompt].startAt;render();if(key==='aboutmyself')playVideo();}else{state.screen='intro';state.phase='ready';render();}}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){stopAudio();video.pause();if(state.phase==='recording')stopRecording();else if(state.phase==='requesting'){cancelCapture();state.phase='ready';render();}}});
 window.addEventListener('pagehide',()=>{cleanup();revoke();});render();
})();
