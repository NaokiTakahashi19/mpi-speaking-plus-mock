# mpi speaking plus モック

既存教材からTalkとAbout myselfを1つずつ選んだ、API不要の体験版です。

## 開くページ

- `index.html`：独立した2教材の入口を表示
- `talk.html`：Talk / Lesson005「Where’re you from?」「I’m from Japan.」
- `aboutmyself.html`：aboutmyself / Lesson1「Hi.」「My name is Reina.」「Thank you.」
- `embed-test.html`：マイクを許可したiframeでの埋め込み表示例

ファイルを直接ブラウザで開くと、画面とサンプルの流れを確認できます。録音の検証にはHTTPS配信かlocalhostを使ってください。実際のSafari・Edge・ChromeとLMSでの検証は別途必要です。

## できること

- 元教材の動画を再生
- Talk：質問の練習、質問を聞いて答える練習
- About myself：元の停止位置（8 / 11 / 13秒）で動画を止め、発話する流れ
- マイクで最大30秒録音し、自分の声を聞き直す
- 録音終了・キャンセル・ページ移動時のマイク解放
- マイク拒否・未接続などのエラー案内
- 録音なしでサンプル評価と最後のふりかえりを体験
- 狭い画面では1列表示。横向き固定なし

## モックの範囲

- 音声認識・発音評価APIは未接続です。音声を外部送信しません。
- 星と励ましは「サンプルの評価」と明記した固定表示です。録音の内容によって変わりません。
- 録音直後には採点せず、聞き直し画面を表示します。サンプル評価は別ボタンで開きます。
- ふりかえりは「録音してれんしゅう」と「サンプルで体験」を区別します。
- 録音はブラウザのメモリ内のみ。次の問題・再録音・ページ終了時に破棄します。リロード後には残りません。
- 成績の永続保存・LMSへの成績送信・利用回数制限・ユーザー認証は未実装です。
- レイナの名前は元教材どおり固定です。本人の名前を入力する機能はありません。
- About myselfの「My name is Reina.」「Thank you.」のお手本はブラウザの英語読み上げです。端末によって声が異なり、利用できない場合は案内します。Hi.とTalkは元教材の音声です。

## 独立HTML版（推奨）

`../public/talk.html`と`../public/aboutmyself.html`は、それぞれ1ファイルで動く配信用HTMLです。動画・音声・画像・CSS・JavaScriptを内包しているため、使いたいHTMLだけをS3へ配置できます。2教材を同じ場所へ置く必要はありません。Talkは約12MBのため、初回にファイル全体を読み込みます。

以下は編集用ソース一式をそのまま配信する場合の説明です。

## S3への配置

`index.html`、`talk.html`、`aboutmyself.html`、`app.js`、`lessons.js`、`styles.css`、`tokens.css`、`assets/`を同じ階層構成のままアップロードしてください。ビルド・npmインストールは不要です。確認用には`embed-test.html`も配置できます。`qa/`とREADMEは配信不要です。

S3は非公開の通常バケットをCloudFrontのオリジンとしてHTTPS配信する構成を想定しています。マイク利用のため、LMS本体と教材の両方をHTTPSにしてください。

配信時の主なContent-Type：

| 拡張子 | Content-Type |
|---|---|
| .html | text/html; charset=utf-8 |
| .js | application/javascript |
| .css | text/css |
| .mp4 | video/mp4 |
| .mp3 | audio/mpeg |
| .jpg | image/jpeg |
| .png | image/png |

S3のアップロード方法によっては、Content-Typeが自動設定されないので確認してください。

## LMS内のiframe

例のドメインは実際の教材配信先に置き換えてください。

```html
<iframe
  src="https://教材配信ドメイン/talk.html?embed=1"
  title="mpi Talk スピーキング練習"
  allow="microphone"
  style="width:100%;height:1000px;border:0"
></iframe>
```

- 教材内に切替ナビゲーションはありません。`?embed=1`で上部のブランドヘッダーを非表示にします。
- `?title=...`で画面上部のタイトルを変更できます。URLエンコードして指定します。
- HTML・JavaScriptの実行とiframe内でのマイク使用をLMS側で許可してください。
- LMSがPermissions-Policyでマイクを禁止している場合は、iframeのallowだけでは許可できません。親画面側の許可も必要です。
- LMSがsandboxを付ける場合は、少なくともallow-scriptsとallow-same-originが必要です。
- CloudFront側のframe-ancestors等がLMSからの埋め込みを妨げていないことも確認してください。
- このモックはiframe高さの自動調整やLMSとのpostMessage通信を実装していません。狭い表示ではiframe内で縦スクロールします。

## 元素材

提供された共有フォルダから、以下をコピーしています。元フォルダは変更していません。

- Talk/Lesson005：video/video_talk.mp4、images/talk01.png、images/talk02.png、audio/talk01.mp3、audio/talk02.mp3
- aboutmyself/Lesson1：video/video_myself.mp4、audio/hi.mp3
- poster.jpgは上記の動画から静止画を抽出
- `assets/aboutmyself/bye.mp3`は原教材からの予備素材。現状のモックでは未使用

教材データの出典と選定理由は`source-manifest.json`に記録しています。

## 今後のAPI接続

録音からAPIへの送信と、評価結果の表示を追加します。HTMLには秘密キーを入れず、API Gateway＋Lambdaなどのサーバー側で認証を行う想定です。1人あたり月50回の判定を前提に、受講者数・録音時間・APIの選定をもとに費用を見積もります。
