/* Original lesson text and media are from the supplied mpi content. No API calls. */
window.MPI_LESSONS = {
  talk: {
    name: 'Talk', lesson: 'Lesson 005', title: 'Where’re you from?',
    subtitle: 'どこから来たの？', intro: 'お手本を見て、ふたりの会話にチャレンジしよう。',
    video: 'assets/talk/model.mp4', poster: 'assets/talk/poster.jpg',
    source: 'Talk/Lesson005',
    prompts: [
      { text: "Where’re you from?", spoken: "Where are you from?", meaning: 'どこから来たの？', instruction: '相手にたずねてみよう。', image: 'assets/talk/scene-1.png', audio: 'assets/talk/question.mp3', role: 'あなたが たずねる' },
      { text: 'I’m from Japan.', spoken: "I'm from Japan.", meaning: '日本から来ました。', instruction: '相手のことばを聞いて、こたえよう。', image: 'assets/talk/scene-2.png', audio: 'assets/talk/answer.mp3', questionAudio: 'assets/talk/question.mp3', question: 'Where’re you from?', role: 'あなたが こたえる' }
    ]
  },
  aboutmyself: {
    name: 'About myself', lesson: 'Lesson 1', title: 'My name is Reina.',
    subtitle: 'じこしょうかいをしよう', intro: '動画の合図に合わせて、レイナのせりふを言ってみよう。',
    video: 'assets/aboutmyself/model.mp4', poster: 'assets/aboutmyself/poster.jpg',
    source: 'aboutmyself/Lesson1',
    prompts: [
      { text: 'Hi.', spoken: 'Hi.', meaning: 'こんにちは。', instruction: 'まずは、元気にあいさつしよう。', role: 'あいさつ', pauseAt: 8, startAt: 0, audio: 'assets/aboutmyself/hi.mp3' },
      { text: 'My name is Reina.', spoken: 'My name is Reina.', meaning: 'わたしの名前はレイナです。', instruction: 'レイナになって、名前を言ってみよう。', role: '名前をいう', pauseAt: 11, startAt: 8 },
      { text: 'Thank you.', spoken: 'Thank you.', meaning: 'ありがとう。', instruction: '最後は、お礼を言おう。', role: 'おれい', pauseAt: 13, startAt: 11 }
    ]
  }
};
