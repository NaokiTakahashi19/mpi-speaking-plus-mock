(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const icons = {
    play: '<path d="m9 5 11 7-11 7z"/>',
    mic: '<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    sound: '<path d="m11 4-6 5H2v6h3l6 5zM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    chat: '<path d="M21 11a8 8 0 0 1-8 8H6l-4 3V11a9 9 0 0 1 19 0Z"/><path d="M7 10h10M7 14h6"/>',
    person: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
    check: '<path d="m5 12 4 4L20 5"/>',
    help: '<circle cx="12" cy="12" r="10"/><path d="M9 8a3 3 0 1 1 4 3c-1 .5-1 1-1 3m0 3v.1"/>',
    replay: '<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
    star: '<path d="m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1z"/>'
  };
  const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.chat}</svg>`;
  const hand = '<path class="guide-hand" d="M102 102 87 85q-4-5 0-8t9 2l6 6V56q0-7 6-7t6 7v16q5-5 10 1 5-3 9 3 7-1 8 7v10q0 12-10 17"/>';
  function drawing(kind) {
    const shapes = {
      watch: '<rect class="guide-paper" x="15" y="16" width="124" height="76" rx="12"/><path d="M61 92v12m-21 0h43"/><path class="guide-yellow" d="m65 37 26 18-26 18z"/>' + hand,
      tap: '<circle class="guide-yellow" cx="73" cy="54" r="40"/><g transform="translate(48 24) scale(2)">' + icons.mic + '</g>' + hand,
      speak: '<circle class="guide-paper" cx="57" cy="51" r="35"/><path d="M26 35q28-33 60 0"/><circle class="guide-eye" cx="45" cy="46" r="2"/><circle class="guide-eye" cx="68" cy="46" r="2"/><ellipse class="guide-yellow" cx="58" cy="65" rx="10" ry="7"/><path class="guide-wave" d="M102 40q15 13 0 26m15-38q26 25 0 50"/><g transform="translate(105 76) scale(1.3)">' + icons.mic + '</g>',
      stop: '<circle class="guide-stop" cx="73" cy="54" r="40"/><rect class="guide-paper" x="58" y="39" width="30" height="30" rx="4"/>' + hand,
      listen: '<circle class="guide-paper" cx="76" cy="59" r="31"/><path d="M34 57V45a42 42 0 0 1 84 0v12"/><rect class="guide-yellow" x="28" y="46" width="17" height="33" rx="8"/><rect class="guide-yellow" x="108" y="46" width="17" height="33" rx="8"/><path d="m68 46 20 13-20 13z"/>',
    };
    return `<svg class="guide-graphic" viewBox="0 0 160 116" aria-hidden="true">${shapes[kind] || shapes.speak}</svg>`;
  }
  function guide(kind = 'record', active = -1) {
    const items = kind === 'watch' ? [['watch', 'みる'], ['listen', 'きく'], ['speak', 'はなす']] : [['tap', 'マイクをおす'], ['speak', 'はなす'], ['stop', 'とめる']];
    return `<ol class="picture-guide" aria-label="${kind === 'watch' ? 'おてほんを見て、聞いて、話す' : 'マイクを押して話し、四角のボタンで止める'}">${items.map(([image, label], i) => `<li ${i === active ? 'class="guide-active" aria-current="step"' : ''}>${drawing(image)}<span>${label}</span></li>`).join('')}</ol>`;
  }
  const query = new URLSearchParams(location.search);
  const initial = query.get('lesson') || document.body.dataset.lesson || 'talk';
  const key = Object.hasOwn(window.MPI_LESSONS, initial) ? initial : (document.body.dataset.lesson || Object.keys(window.MPI_LESSONS)[0]);
  const lesson = window.MPI_LESSONS[key];
  const embedded = query.get('embed') === '1';
  const state = { stage: 'watch', prompt: 0, phase: 'ready', results: lesson.prompts.map(() => null), generation: 0 };
  let stream = null, recorder = null, audioContext = null, timer = null, meterFrame = null;
  let playbackUrl = null, audio = null, recordingStarted = 0;
  let spokenGeneration = 0, recordingPeak = 0, monitorAvailable = false;
  document.body.dataset.lesson = key;
  if (embedded) document.body.classList.add('embedded');
  document.title = `${lesson.name} · ${lesson.title} | mpi speaking plus`;
  const app = $('app');
  app.innerHTML = `
    <section class="lesson-identity" aria-label="いまのきょうざい">
      <div class="shell identity-inner">
        <span class="identity-symbol" aria-hidden="true">${icon(key === 'talk' ? 'chat' : 'person')}</span>
        <div class="identity-title"><p class="identity-name" lang="en">${lesson.name}</p><p class="identity-description">${key === 'talk' ? 'かいわ' : 'じこしょうかい'}</p></div>
        <span class="identity-lesson">${lesson.lesson}</span>
      </div>
    </section>
    <header class="header shell">
      <div class="brand"><img class="mpi-logo" src="assets/brand/mpi-logo.png" width="432" height="82" alt="mpi英語プログラム"><span class="brand-program">speaking plus</span></div>

    </header>
    <main class="shell" id="main">
      <div class="page-head"><div><p class="lesson-meta" id="lesson-meta"></p><h1 id="page-title"></h1><p class="subtitle" id="subtitle"></p></div><button class="help" id="help-button" type="button">${icon('help')}<span>つかいかた</span></button></div>
      <ol class="steps" aria-label="れんしゅうの流れ">
        <li id="step-watch"><span class="step-number">1</span>${icon('play')}<span>みる</span></li>
        <li id="step-practice"><span class="step-number">2</span>${icon('mic')}<span>はなす</span></li>
        <li id="step-finish"><span class="step-number">3</span>${icon('check')}<span>できた</span></li>
      </ol>
      <div id="lesson-body">
        <div class="workbench">
          <section class="media-panel" aria-label="お手本と会話の場面">
            <div class="media-top"><span class="media-label" id="media-label">${icon('play')}おてほん</span><span class="media-tag" id="media-tag"></span></div>
            <div class="video-wrap"><video id="model-video" width="880" height="484" controls playsinline preload="metadata"></video><img class="scene" id="scene" width="720" height="480" alt="" hidden><div class="video-cover" id="video-cover"><button class="play-big" id="play-video" aria-label="お手本動画を再生">${icon('play')}</button></div></div>
            <div class="media-caption"><span id="media-caption">▶ を おしてね</span><button class="small-btn" id="replay-video" type="button">${icon('replay')}もう一度みる</button></div>
          </section>
          <section class="practice-panel" id="practice-panel" aria-label="スピーキングれんしゅう"></section>
        </div>
        <div class="tip"><span class="buddy" aria-hidden="true">: )</span><p id="tip-text">ゆっくり、はなしてみよう。</p></div>
      </div>
      <section class="finished" id="finished" hidden aria-label="今日のふりかえり"></section>
      <footer class="foot"><span class="mock-label">たいけんばん · 星とコメントはサンプルです</span><span>mpi 英語プログラム · speaking plus</span></footer>
    </main>
    <dialog id="help-dialog" aria-labelledby="help-title"><h2 id="help-title">やってみよう</h2>${guide()}<button class="small-btn" id="help-audio">${icon('sound')}せつめいをきく</button><details class="adult-tools"><summary>おとなのかたへ</summary><p>録音は1回30秒まで。声はサーバーに送信しません。星とコメントはサンプル表示です。マイクの許可画面が表示された場合は、端末の設定を確認してください。</p></details><button class="btn" id="close-help">${icon('check')}わかった</button></dialog>`;
  $('lesson-meta').textContent = lesson.lesson;
  $('page-title').textContent = query.get('title')?.slice(0, 80) || lesson.title;
  $('subtitle').textContent = lesson.subtitle;
  const video = $('model-video');
  video.src = lesson.video;
  video.poster = lesson.poster;
  video.addEventListener('loadedmetadata', () => { if (video.videoWidth && video.videoHeight) { video.width = video.videoWidth; video.height = video.videoHeight; } });
  $('media-tag').textContent = key === 'talk' ? '会話のお手本' : '動画に合わせてチャレンジ';
  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  $('help-audio').onclick = readGuide;
  $('close-help').addEventListener('click', () => $('help-dialog').close());
  $('help-dialog').addEventListener('click', (event) => { if (event.target === $('help-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });

  function stopAudio() {
    spokenGeneration++;
    if (audio) { audio.pause(); audio.onended = null; audio.onerror = null; audio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const button = $('listen-model');
    if (button) { button.disabled = ['recording', 'requesting', 'saving', 'cue'].includes(state.phase); button.innerHTML = icon('sound') + 'おてほん'; }
  }
  function revokeRecording() { if (playbackUrl) URL.revokeObjectURL(playbackUrl); playbackUrl = null; }
  function stopMonitor() {
    clearInterval(timer); timer = null;
    cancelAnimationFrame(meterFrame); meterFrame = null;
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
  }
  function releaseTracks() { if (stream) stream.getTracks().forEach(track => track.stop()); stream = null; }
  function cancelRecording() {
    state.generation++;
    if (recorder && recorder.state !== 'inactive') { recorder.onstop = null; recorder.stop(); }
    recorder = null; stopMonitor(); releaseTracks();
  }
  function cleanup() { cancelRecording(); stopAudio(); video.pause(); const player = $('my-voice'); if (player) player.pause(); }
  function setSteps() {
    const stages = ['watch', 'practice', 'finish'];
    stages.forEach((stage, index) => {
      const li = $(`step-${stage}`), current = stages.indexOf(state.stage);
      li.className = index === current ? 'current' : index < current ? 'complete' : '';
      li.querySelector('.step-number').textContent = index < current ? '✓' : index + 1;
      if (index === current) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }
  function status(message, error = false) {
    const box = $('status');
    if (!box) return;
    box.textContent = message;
    box.className = error ? 'error' : 'status';
    box.setAttribute('role', error ? 'alert' : 'status');
  }
  function focusPanel() { const h = $('practice-heading'); if (h) h.focus({ preventScroll: true }); if (innerWidth < 896 && state.stage === 'practice' && state.phase !== 'cue') $('practice-panel').scrollIntoView({ block: 'start' }); }
  function setMedia() {
    const prompt = lesson.prompts[state.prompt];
    const showScene = state.stage === 'practice' && key === 'talk';
    video.hidden = showScene;
    $('scene').hidden = !showScene;
    $('video-cover').hidden = showScene || !video.paused || state.stage === 'finish';
    if (showScene) { $('scene').src = prompt.image; $('scene').alt = `${prompt.role}：${prompt.meaning}`; }
    $('media-label').innerHTML = icon(showScene ? 'chat' : 'play') + (showScene ? 'きょうの かいわ' : state.stage === 'practice' ? 'あいずを みよう' : 'おてほん');
    $('replay-video').hidden = showScene;
    $('media-caption').textContent = showScene ? prompt.role : state.stage === 'practice' ? 'とまったら、あなたの ばん！' : '▶ を おしてね';
  }
  async function playVideo(restart = false) {
    if (state.phase === 'recording' || state.phase === 'requesting' || state.phase === 'saving') return;
    stopAudio();
    if (state.stage === 'practice' && key === 'aboutmyself') {
      state.phase = 'cue';
      renderPanel();
      if (innerWidth < 896) video.scrollIntoView({ block: 'start' });
      if (restart || video.currentTime >= lesson.prompts[state.prompt].pauseAt) video.currentTime = lesson.prompts[state.prompt].startAt;
    } else if (restart) video.currentTime = 0;
    try { await video.play(); $('video-cover').hidden = true; }
    catch { if (state.phase === 'cue') { state.phase = 'ready'; renderPanel(); } status('動画を再生できませんでした。再生ボタンをもう一度おしてね。', true); }
  }
  $('play-video').addEventListener('click', () => playVideo());
  $('replay-video').addEventListener('click', () => playVideo(true));
  video.addEventListener('play', () => {
    if (['recording', 'requesting', 'saving'].includes(state.phase)) { video.pause(); return; }
    stopAudio(); $('video-cover').hidden = true;
  });
  video.addEventListener('pause', () => {
    if (state.stage === 'watch') $('video-cover').hidden = false;
  });
  video.addEventListener('ended', () => {
    $('video-cover').hidden = false;
    if (state.stage === 'watch') { $('media-caption').textContent = 'つぎは、あなたの ばん！'; }
    else if (state.phase === 'cue') { state.phase = 'ready'; renderPanel(); }
  });
  video.addEventListener('error', () => status('動画を読み込めませんでした。教材フォルダのassetsを確認してください。', true));
  video.addEventListener('timeupdate', () => {
    if (state.stage === 'practice' && key === 'aboutmyself' && state.phase === 'cue' && video.currentTime >= lesson.prompts[state.prompt].pauseAt) {
      video.pause(); state.phase = 'ready'; renderPanel(); focusPanel();
      $('media-caption').textContent = 'マイクを おしてね';
    }
  });

  function renderPanel() {
    setSteps(); setMedia();
    const panel = $('practice-panel');
    if (state.stage === 'watch') {
      panel.innerHTML = `<div class="prompt-top"><span class="role lesson-badge">${lesson.name}</span><button class="guide-audio small-btn" id="read-guide" aria-label="つかいかたを音声で聞く">${icon('sound')}やりかた</button></div><h2 id="practice-heading" tabindex="-1">おてほんを みよう</h2>${guide('watch', 0)}<div class="actions"><button class="btn picture-button" id="start-practice">${icon('mic')}はなす${icon('arrow')}</button></div><div id="status" class="status" aria-live="polite"></div>`;
      $('start-practice').onclick = startPractice;
      $('read-guide').onclick = readGuide;
      return;
    }
    const p = lesson.prompts[state.prompt];
    const isReview = state.phase === 'review';
    const busy = ['recording', 'requesting', 'saving', 'cue'].includes(state.phase);
    const instruction = state.phase === 'recording' ? 'はなしてみよう' : isReview ? 'じぶんの こえを きこう' : state.phase === 'cue' ? 'あいずを まってね' : 'あなたの ばん！';
    panel.innerHTML = `<div class="prompt-top"><span class="role">${icon(key === 'talk' ? 'chat' : 'person')}${p.role}</span><span class="count">${state.prompt + 1} / ${lesson.prompts.length}</span><button class="small-btn guide-audio" id="read-guide" ${busy ? 'disabled' : ''} aria-label="つかいかたを音声で聞く">${icon('sound')}やりかた</button></div><h2 id="practice-heading" tabindex="-1">${instruction}</h2><div class="target"><p class="english" lang="en">${p.text}</p><p class="meaning">${p.meaning}</p></div><button class="listen" id="listen-model" ${busy ? 'disabled' : ''}>${icon('sound')}おてほん</button>
      <div id="status" class="status" aria-live="polite"></div>
      ${state.phase === 'recording' ? `<div class="speaking-picture">${drawing('speak')}<div class="recording" role="status"><span class="record-dot"></span><span>きいているよ</span><span class="meter" id="meter" aria-hidden="true">${'<i></i>'.repeat(9)}</span><span class="timer" id="timer">0:00</span></div></div><div class="actions"><button class="btn btn--stop picture-button" id="stop-recording" aria-label="はなしおわったら録音を止める">${icon('stop')}おわった</button></div><p class="record-note">■ を おしてね</p>` : state.phase === 'requesting' || state.phase === 'saving' ? `<p class="instruction" role="status">${state.phase === 'requesting' ? 'マイクを じゅんびちゅう…' : 'ちょっと まってね…'}</p><div class="sub-action"><button class="text-btn" id="cancel-recording">やめる</button></div>` : isReview ? `<div class="feedback"><div class="voice-review">${drawing('listen')}<button class="btn picture-button" id="listen-own" aria-label="録音した自分の声を再生する">${icon('play')}きく</button></div><audio class="playback" id="my-voice" controls aria-label="じぶんのこえ"></audio><div class="actions"><button class="small-btn" id="retry-recording">${icon('replay')}もういちど</button></div><details class="adult-tools"><summary>おとなのかたへ</summary><button class="small-btn" id="sample-result">サンプル評価を見る</button><p>音声は送信・採点していません。</p></details></div>` : state.phase === 'sample' ? '' : `${state.phase === 'cue' ? `<div class="cue-picture">${drawing('watch')}</div>` : guide('record', 0)}<div class="actions"><button class="btn btn--record picture-button" id="record" ${state.phase === 'cue' ? 'disabled' : ''}>${icon('mic')}はなす</button></div><details class="adult-tools"><summary>おとなのかたへ</summary><p>音声API未接続のモックです。録音なしでも画面の流れを確認できます。</p><button class="text-btn" id="skip-recording" ${state.phase === 'cue' ? 'disabled' : ''}>録音せずに体験する</button>${state.phase === 'cue' ? '<button class="text-btn" id="skip-cue">合図をスキップ</button>' : ''}</details>`}
      <div id="result-area"></div><div class="sub-action"><button class="text-btn back-action" id="back" aria-label="${state.prompt ? 'ひとつ前にもどる' : 'おてほんにもどる'}">${icon('replay')}もどる</button></div>`;
    $('listen-model').onclick = listenModel;
    $('read-guide').onclick = readGuide;
    if ($('listen-own')) $('listen-own').onclick = () => { stopAudio(); $('my-voice').play().catch(() => status('もういちど ▶ を おしてね。', true)); };
    if ($('record')) $('record').onclick = record;
    if ($('stop-recording')) $('stop-recording').onclick = stopRecording;
    if ($('cancel-recording')) $('cancel-recording').onclick = () => { cancelRecording(); state.phase = 'ready'; renderPanel(); };
    if ($('skip-recording')) $('skip-recording').onclick = () => { state.phase = 'sample'; renderPanel(); showSample(); };
    if ($('skip-cue')) $('skip-cue').onclick = () => { video.pause(); state.phase = 'ready'; renderPanel(); };
    if ($('retry-recording')) $('retry-recording').onclick = record;
    if ($('sample-result')) $('sample-result').onclick = () => { stopAudio(); showSample(); };
    if (isReview && playbackUrl) { $('my-voice').src = playbackUrl; $('my-voice').onplay = stopAudio; showNext(false); }
    if (state.phase === 'sample') showSample();
    $('back').onclick = () => {
      cleanup(); revokeRecording();
      if (state.prompt > 0) { state.prompt--; state.phase = 'ready'; renderPanel(); }
      else { state.stage = 'watch'; state.phase = 'ready'; video.currentTime = 0; renderPanel(); }
      focusPanel();
    };
  }
  function readGuide() {
    stopAudio(); video.pause(); if ($('my-voice')) $('my-voice').pause();
    if (!('speechSynthesis' in window)) { status('この きかいでは、せつめいを よめません。えを みてね。', true); return; }
    const text = $('help-dialog').open ? 'マイクのボタンを押して、英語をはなしてね。はなし終わったら、四角い、おわったボタンを押そう。' : state.stage === 'watch' ? 'さんかくのボタンを押して、お手本を見てね。見終わったら、マイクのボタンで、はなす練習をはじめよう。' : state.phase === 'review' ? 'さんかくの、きくボタンを押すと、自分の声が聞けるよ。もういちど、のボタンで、やり直せるよ。' : 'マイクのボタンを押して、英語をはなしてね。はなし終わったら、四角い、おわったボタンを押そう。';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP'; utterance.rate = .9;
    const voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('ja'));
    if (voice) utterance.voice = voice;
    utterance.onerror = event => { if (!['canceled', 'interrupted'].includes(event.error)) status('せつめいを よめませんでした。えを みてね。', true); };
    speechSynthesis.speak(utterance);
  }
  function startPractice() {
    cleanup(); revokeRecording();
    state.stage = 'practice'; state.prompt = 0; state.phase = 'ready';
    renderPanel(); focusPanel();
    if (key === 'aboutmyself') playVideo(true);
  }
  async function listenModel() {
    stopAudio(); video.pause(); if ($('my-voice')) $('my-voice').pause();
    const p = lesson.prompts[state.prompt], button = $('listen-model');
    button.disabled = true; button.innerHTML = icon('sound') + 'きいてね';
    const generation = spokenGeneration;
    try {
      if (p.questionAudio) await playFile(p.questionAudio, generation);
      if (generation !== spokenGeneration) return;
      if (p.audio) await playFile(p.audio, generation);
      else await speak(p.spoken, generation);
    } catch { if (generation === spokenGeneration) status('お手本の音声を再生できませんでした。もう一度おしてね。', true); }
    finally { if (generation === spokenGeneration && $('listen-model')) { $('listen-model').disabled = false; $('listen-model').innerHTML = icon('sound') + 'おてほん'; } }
  }
  function playFile(src, generation) {
    return new Promise((resolve, reject) => {
      if (generation !== spokenGeneration) return resolve();
      audio = new Audio(src);
      audio.onended = resolve; audio.onerror = reject;
      audio.play().catch(reject);
    });
  }
  function speak(text, generation) {
    return new Promise((resolve, reject) => {
      if (generation !== spokenGeneration) return resolve();
      if (!('speechSynthesis' in window)) return reject(new Error('No speech synthesis'));
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US'; utterance.rate = .85;
      const voice = speechSynthesis.getVoices().find(v => v.lang === 'en-US') || speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
      utterance.onend = resolve; utterance.onerror = reject;
      window.speechSynthesis.speak(utterance);
    });
  }
  function setupMonitor() {
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audioContext = new Context();
      audioContext.resume().catch(() => {});
      const source = audioContext.createMediaStreamSource(stream), analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024; source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const update = () => {
        if (!audioContext || !stream) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) sum += ((value - 128) / 128) ** 2;
        const rms = Math.sqrt(sum / data.length); recordingPeak = Math.max(recordingPeak, rms);
        if (audioContext.state === 'running') monitorAvailable = true;
        document.querySelectorAll('#meter i').forEach((bar, i) => { bar.style.transform = `scaleY(${Math.max(.12, Math.min(1, rms * 12 * (1 - Math.abs(i - 4) / 7)))})`; });
        meterFrame = requestAnimationFrame(update);
      };
      update();
    } catch { stopMonitor(); }
  }
  async function record() {
    cleanup(); revokeRecording();
   
    const generation = state.generation;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      state.phase = 'ready'; renderPanel();
      status('この環境では録音できません。HTTPSで開くか、Safari・Chrome・Edgeの新しいバージョンで試してね。「録音せずに体験する」でも進めます。', true); return;
    }
    state.phase = 'requesting'; renderPanel();
    try {
      const candidate = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      if (generation !== state.generation) { candidate.getTracks().forEach(track => track.stop()); return; }
      stream = candidate;
      const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'];
      const mimeType = types.find(type => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder = capture;
      const chunks = [];
      recordingPeak = 0; monitorAvailable = false;
      capture.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      capture.onerror = () => {
        if (generation !== state.generation) return;
        cancelRecording(); state.phase = 'ready'; renderPanel(); status('録音が止まりました。マイクを確認して、もう一度はなしてね。', true);
      };
      capture.onstop = () => {
        stopMonitor(); releaseTracks(); recorder = null;
        if (generation !== state.generation) return;
        const duration = (Date.now() - recordingStarted) / 1000;
        const blob = new Blob(chunks, { type: capture.mimeType || mimeType || chunks[0]?.type || 'audio/webm' });
        state.phase = 'ready';
        if (blob.size < 100 || duration < .5) { renderPanel(); status('録音が短すぎたよ。もう一度マイクをおして話してみよう。', true); return; }
        if (monitorAvailable && recordingPeak < .003) { renderPanel(); status('声を確認できなかったよ。マイクに近づいて、もう一度話してみよう。', true); return; }
        playbackUrl = URL.createObjectURL(blob);
        state.phase = 'review'; renderPanel(); focusPanel();
        status('▶ で じぶんの こえを きこう。');
      };
      capture.start(); recordingStarted = Date.now(); state.phase = 'recording'; renderPanel(); setupMonitor();
      timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStarted) / 1000);
        if ($('timer')) $('timer').textContent = `0:${String(elapsed).padStart(2, '0')}`;
        if (elapsed >= 30) stopRecording();
      }, 250);
      stream.getAudioTracks().forEach(track => track.addEventListener('ended', () => { if (recorder?.state === 'recording') stopRecording(); }));
    } catch (error) {
      if (generation !== state.generation) return;
      stopMonitor(); releaseTracks(); recorder = null; state.phase = 'ready'; renderPanel();
      const message = error.name === 'NotAllowedError' || error.name === 'SecurityError'
        ? 'マイクを使えませんでした。ブラウザのマイクを「許可」にしてね。LMSの中だけで使えないときは、先生に確認してね。'
        : error.name === 'NotFoundError' ? 'マイクが見つからなかったよ。マイクをつないで、もう一度試してね。'
        : error.name === 'NotReadableError' ? 'マイクを使えませんでした。ほかのアプリの録音を止めて、もう一度試してね。'
        : '録音を始められませんでした。マイクとブラウザを確認して、もう一度試してね。';
      status(message + '「録音せずに体験する」でも進めます。', true);
    }
  }
  function stopRecording() {
    if (!recorder || recorder.state !== 'recording') return;
    state.phase = 'saving'; clearInterval(timer); timer = null;
    recorder.stop(); renderPanel();
  }
  function showSample() {
    const box = $('result-area'); if (!box) return;
    box.innerHTML = `<div class="sample-result"><span class="sample-label">サンプルの評価</span><div class="sample-stars" aria-label="星3つの表示例">★★★</div><h3>いいね！ その調子。</h3><p>この星とコメントは表示例です。<br>あなたの声を採点した結果ではありません。</p></div>`;
    showNext(true);
  }
  function showNext(withSample) {
    const area = $('result-area');
    const old = $('next-prompt'); if (old) old.remove();
    const button = document.createElement('button');
    button.id = 'next-prompt'; button.className = 'btn picture-button'; button.style.marginTop = '16px';
    button.innerHTML = (state.prompt === lesson.prompts.length - 1 ? 'できた' : 'つぎへ') + icon('arrow');
    button.onclick = () => nextPrompt(withSample);
    area.append(button);
  }
  function nextPrompt(withSample) {
    const recorded = Boolean(playbackUrl);
    state.results[state.prompt] = { recorded, sample: Boolean(withSample) };
    cleanup(); revokeRecording();
    if (state.prompt < lesson.prompts.length - 1) {
      state.prompt++; state.phase = 'ready'; renderPanel(); focusPanel();
      if (key === 'aboutmyself') playVideo(true);
    } else finish();
  }
  function finish() {
    state.stage = 'finish'; state.phase = 'ready'; setSteps();
    $('lesson-body').hidden = true; $('finished').hidden = false;
    const count = state.results.filter(result => result?.recorded).length;
    $('finished').innerHTML = `<div class="finish-hero"><div class="finish-mark" aria-hidden="true">${icon('star')}</div><div><h2 class="end-title" id="finish-heading" tabindex="-1" lang="en">You did it!</h2><p>きょうは ここまで！</p></div></div><ul class="summary">${lesson.prompts.map((p, i) => `<li><div><p class="english" lang="en">${p.text}</p><p class="meaning">${p.meaning}</p></div><span class="summary-state">${state.results[i]?.recorded ? '✓ はなしたよ' : 'サンプルで体験'}</span></li>`).join('')}</ul><p class="instruction">${count ? `${count}つのことばを録音したよ。` : '画面の流れを体験したよ。'}</p><div class="actions" style="margin-top:24px"><button class="btn" id="restart">${icon('replay')}もういちど</button><button class="btn btn--soft" id="to-model">おてほんにもどる</button></div>`;
    $('finish-heading').focus({ preventScroll: true });
    $('restart').onclick = () => { state.results = lesson.prompts.map(() => null); $('lesson-body').hidden = false; $('finished').hidden = true; startPractice(); };
    $('to-model').onclick = () => { state.results = lesson.prompts.map(() => null); state.stage = 'watch'; state.prompt = 0; $('lesson-body').hidden = false; $('finished').hidden = true; video.currentTime = 0; renderPanel(); focusPanel(); };
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopAudio(); video.pause(); if (state.phase === 'recording') stopRecording(); else if (state.phase === 'requesting') { cancelRecording(); state.phase = 'ready'; renderPanel(); } } });
  window.addEventListener('pagehide', () => { cleanup(); revokeRecording(); });
  renderPanel();
})();
