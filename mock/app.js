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
  const query = new URLSearchParams(location.search);
  const initial = query.get('lesson') || document.body.dataset.lesson || 'talk';
  const key = Object.hasOwn(window.MPI_LESSONS, initial) ? initial : 'talk';
  const lesson = window.MPI_LESSONS[key];
  const embedded = query.get('embed') === '1';
  const state = { stage: 'watch', prompt: 0, phase: 'ready', results: lesson.prompts.map(() => null), generation: 0 };
  let stream = null, recorder = null, audioContext = null, timer = null, meterFrame = null;
  let playbackUrl = null, audio = null, recordingStarted = 0;
  let spokenGeneration = 0, recordingPeak = 0, monitorAvailable = false;
  if (embedded) document.body.classList.add('embedded');
  document.title = `${lesson.name} · ${lesson.title} | mpi speaking plus`;
  const app = $('app');
  app.innerHTML = `
    <header class="header shell">
      <div class="brand" aria-label="mpi speaking plus"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span><span class="brand-name">mpi <span style="font-weight:400">speaking plus</span></span><span class="brand-small">英語を、声に出してみよう。</span></span></div>
      <nav class="lesson-nav" aria-label="教材をえらぶ">
        <a class="lesson-link" href="?lesson=talk" ${key === 'talk' ? 'aria-current="page"' : ''}>${icon('chat')}Talk</a>
        <a class="lesson-link" href="?lesson=aboutmyself" ${key === 'aboutmyself' ? 'aria-current="page"' : ''}>${icon('person')}About myself</a>
      </nav>
    </header>
    <main class="shell" id="main">
      <div class="page-head"><div><p class="lesson-meta" id="lesson-meta"></p><h1 id="page-title"></h1><p class="subtitle" id="subtitle"></p></div><button class="help" id="help-button" type="button">${icon('help')}<span>つかいかた</span></button></div>
      <ol class="steps" aria-label="れんしゅうの流れ">
        <li id="step-watch"><span class="step-number">1</span>お手本をみる</li>
        <li id="step-practice"><span class="step-number">2</span>はなしてみる</li>
        <li id="step-finish"><span class="step-number">3</span>ふりかえる</li>
      </ol>
      <div id="lesson-body">
        <div class="workbench">
          <section class="media-panel" aria-label="お手本と会話の場面">
            <div class="media-top"><span class="media-label" id="media-label">${icon('play')}お手本の動画</span><span class="media-tag" id="media-tag"></span></div>
            <div class="video-wrap"><video id="model-video" controls playsinline preload="metadata"></video><img class="scene" id="scene" width="720" height="480" alt="" hidden><div class="video-cover" id="video-cover"><button class="play-big" id="play-video" aria-label="お手本動画を再生">${icon('play')}</button></div></div>
            <div class="media-caption"><span id="media-caption">音を出して、お手本をみよう。</span><button class="small-btn" id="replay-video" type="button">${icon('replay')}もう一度みる</button></div>
          </section>
          <section class="practice-panel" id="practice-panel" aria-label="スピーキングれんしゅう"></section>
        </div>
        <div class="tip"><span class="buddy" aria-hidden="true">: )</span><p id="tip-text">小さな声でも、ゆっくりでも大丈夫。まずは声に出してみよう。</p></div>
      </div>
      <section class="finished" id="finished" hidden aria-label="今日のふりかえり"></section>
      <footer class="foot"><span class="mock-label">体験版 · 音声の送信・自動採点は行いません</span><span>mpi 英語プログラム · speaking plus</span></footer>
    </main>
    <dialog id="help-dialog" aria-labelledby="help-title"><h2 id="help-title">れんしゅうのしかた</h2><p>① お手本をみる<br>② マイクをおして、英語をはなす<br>③「おわった」をおして、自分の声を聞く</p><p>マイクを使っていいか聞かれたら「許可」をえらんでね。録音は1回30秒までです。</p><p>この体験版は録音と聞き直しができます。星とコメントはサンプルで、声を採点した結果ではありません。録音はサーバーに送らず、このページ内だけで使います。</p><button class="btn" id="close-help">わかった${icon('check')}</button></dialog>`;
  $('lesson-meta').textContent = `${lesson.name}  /  ${lesson.lesson}`;
  $('page-title').textContent = query.get('title')?.slice(0, 80) || lesson.title;
  $('subtitle').textContent = lesson.subtitle;
  const video = $('model-video');
  video.src = lesson.video;
  video.poster = lesson.poster;
  $('media-tag').textContent = key === 'talk' ? '会話のお手本' : '動画に合わせてチャレンジ';
  $('help-button').addEventListener('click', () => $('help-dialog').showModal());
  $('close-help').addEventListener('click', () => $('help-dialog').close());
  $('help-dialog').addEventListener('click', (event) => { if (event.target === $('help-dialog')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });

  function stopAudio() {
    spokenGeneration++;
    if (audio) { audio.pause(); audio.onended = null; audio.onerror = null; audio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const button = $('listen-model');
    if (button) { button.disabled = false; button.innerHTML = icon('sound') + 'お手本をきく'; }
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
    $('media-label').innerHTML = icon(showScene ? 'chat' : 'play') + (showScene ? '今日の会話' : state.stage === 'practice' ? '動画の合図に合わせよう' : 'お手本の動画');
    $('replay-video').hidden = showScene;
    $('media-caption').textContent = showScene ? prompt.role : state.stage === 'practice' ? '動画が止まったら、あなたの番だよ。' : '音を出して、お手本をみよう。';
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
    if (state.stage === 'watch') { $('media-caption').textContent = 'お手本をみたら、あなたも言ってみよう。'; }
    else if (state.phase === 'cue') { state.phase = 'ready'; renderPanel(); }
  });
  video.addEventListener('error', () => status('動画を読み込めませんでした。教材フォルダのassetsを確認してください。', true));
  video.addEventListener('timeupdate', () => {
    if (state.stage === 'practice' && key === 'aboutmyself' && state.phase === 'cue' && video.currentTime >= lesson.prompts[state.prompt].pauseAt) {
      video.pause(); state.phase = 'ready'; renderPanel(); focusPanel();
      $('media-caption').textContent = 'あなたの番！ マイクをおして言ってみよう。';
    }
  });

  function renderPanel() {
    setSteps(); setMedia();
    const panel = $('practice-panel');
    if (state.stage === 'watch') {
      panel.innerHTML = `<div class="prompt-top"><span class="role">${icon(key === 'talk' ? 'chat' : 'person')}${lesson.name}</span><span class="count">${lesson.prompts.length}つのことば</span></div><h2 id="practice-heading" tabindex="-1">まずは、お手本をみよう。</h2><p class="instruction">${lesson.intro}</p><div class="target"><p class="english" lang="en">${lesson.title}</p><p class="meaning">${lesson.subtitle}</p></div><div class="actions"><button class="btn" id="start-practice">れんしゅうをはじめる${icon('arrow')}</button></div><p class="record-note">マイクを使わずに、画面の流れも体験できます。</p><div id="status" class="status" aria-live="polite"></div>`;
      $('start-practice').onclick = startPractice;
      return;
    }
    const p = lesson.prompts[state.prompt];
    const isReview = state.phase === 'review';
    const busy = ['recording', 'requesting', 'saving', 'cue'].includes(state.phase);
    panel.innerHTML = `<div class="prompt-top"><span class="role">${icon(key === 'talk' ? 'chat' : 'person')}${p.role}</span><span class="count">${state.prompt + 1} / ${lesson.prompts.length}</span></div><h2 id="practice-heading" tabindex="-1">${p.instruction}</h2><p class="instruction">${p.question ? '「お手本をきく」で、質問と答えを聞けるよ。' : 'お手本を聞いたら、あなたの番だよ。'}</p><div class="target"><p class="english" lang="en">${p.text}</p><p class="meaning">${p.meaning}</p></div><button class="listen" id="listen-model" ${busy ? 'disabled' : ''}>${icon('sound')}お手本をきく</button>
      <div id="status" class="status" aria-live="polite"></div>
      ${state.phase === 'recording' ? `<div class="recording" role="status"><span class="record-dot"></span><span>きいているよ</span><span class="meter" id="meter" aria-hidden="true">${'<i></i>'.repeat(9)}</span><span class="timer" id="timer">0:00</span></div><div class="actions"><button class="btn btn--stop" id="stop-recording">${icon('stop')}おわった</button></div><p class="record-note">言いおわったら「おわった」をおしてね。30秒で止まります。</p>` : state.phase === 'requesting' || state.phase === 'saving' ? `<p class="instruction" role="status">${state.phase === 'requesting' ? 'マイクをじゅんびしています…' : '録音をまとめています…'}</p><div class="sub-action"><button class="text-btn" id="cancel-recording">キャンセル</button></div>` : isReview ? `<div class="feedback"><h3>${icon('check')}録音できたよ。</h3><p>自分の声を聞いてみよう。</p><audio class="playback" id="my-voice" controls></audio><div class="actions"><button class="small-btn" id="retry-recording">${icon('replay')}もう一度はなす</button><button class="small-btn" id="sample-result">サンプル評価を見る</button></div></div>` : state.phase === 'sample' ? '' : `<div class="actions" style="margin-top:20px"><button class="btn btn--record" id="record" ${state.phase === 'cue' ? 'disabled' : ''}>${icon('mic')}はなしてみる</button></div><p class="record-note">${state.phase === 'cue' ? '動画の合図を待ってね。' : 'マイクをおしてから話そう。声はこのページ内だけで使うよ。'}</p><div class="sub-action"><button class="text-btn" id="skip-recording" ${state.phase === 'cue' ? 'disabled' : ''}>録音せずに体験する</button>${state.phase === 'cue' ? '<button class="text-btn" id="skip-cue" style="margin-left:16px">合図をスキップ</button>' : ''}</div>`}
      <div id="result-area"></div><div class="sub-action"><button class="text-btn" id="back">${state.prompt ? 'ひとつ前にもどる' : 'お手本にもどる'}</button></div>`;
    $('listen-model').onclick = listenModel;
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
  function startPractice() {
    cleanup(); revokeRecording();
    state.stage = 'practice'; state.prompt = 0; state.phase = 'ready';
    renderPanel(); focusPanel();
    if (key === 'aboutmyself') playVideo(true);
  }
  async function listenModel() {
    stopAudio(); video.pause(); if ($('my-voice')) $('my-voice').pause();
    const p = lesson.prompts[state.prompt], button = $('listen-model');
    button.disabled = true; button.innerHTML = icon('sound') + 'お手本を再生中';
    const generation = spokenGeneration;
    try {
      if (p.questionAudio) await playFile(p.questionAudio, generation);
      if (generation !== spokenGeneration) return;
      if (p.audio) await playFile(p.audio, generation);
      else await speak(p.spoken, generation);
    } catch { if (generation === spokenGeneration) status('お手本の音声を再生できませんでした。もう一度おしてね。', true); }
    finally { if (generation === spokenGeneration && $('listen-model')) { $('listen-model').disabled = false; $('listen-model').innerHTML = icon('sound') + 'お手本をきく'; } }
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
        status('録音はこのページ内だけで再生できます。自動採点はしていません。');
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
    button.id = 'next-prompt'; button.className = 'btn'; button.style.marginTop = '16px';
    button.innerHTML = (state.prompt === lesson.prompts.length - 1 ? 'ふりかえる' : 'つぎのことばへ') + icon('arrow');
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
    $('finished').innerHTML = `<div class="finish-hero"><div class="finish-mark" aria-hidden="true">${icon('star')}</div><div><h2 class="end-title" id="finish-heading" tabindex="-1" lang="en">You did it!</h2><p>今日のことばを、ふりかえろう。</p></div></div><ul class="summary">${lesson.prompts.map((p, i) => `<li><div><p class="english" lang="en">${p.text}</p><p class="meaning">${p.meaning}</p></div><span class="summary-state">${state.results[i]?.recorded ? '✓ 録音してれんしゅう' : 'サンプルで体験'}</span></li>`).join('')}</ul><p class="instruction">${count ? `${count}つのことばを録音したよ。` : '画面の流れを体験したよ。'} この体験版では、声の採点やLMSへの結果保存は行いません。</p><div class="actions" style="margin-top:24px"><button class="btn" id="restart">${icon('replay')}もう一度れんしゅう</button><button class="btn btn--soft" id="to-model">お手本にもどる</button></div>`;
    $('finish-heading').focus({ preventScroll: true });
    $('restart').onclick = () => { state.results = lesson.prompts.map(() => null); $('lesson-body').hidden = false; $('finished').hidden = true; startPractice(); };
    $('to-model').onclick = () => { state.results = lesson.prompts.map(() => null); state.stage = 'watch'; state.prompt = 0; $('lesson-body').hidden = false; $('finished').hidden = true; video.currentTime = 0; renderPanel(); focusPanel(); };
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopAudio(); video.pause(); if (state.phase === 'recording') stopRecording(); else if (state.phase === 'requesting') { cancelRecording(); state.phase = 'ready'; renderPanel(); } } });
  window.addEventListener('pagehide', () => { cleanup(); revokeRecording(); });
  renderPanel();
})();
