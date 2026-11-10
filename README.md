# mpi speaking plus モック

小学生向けの英語スピーキング教材のモックです。HTML・CSS・JavaScriptだけで動きます。

- **Talk / Lesson005**：Where’re you from? / I’m from Japan.
- **About myself / Lesson1**：Hi. / My name is Reina. / Thank you.

元教材の動画・音声、マイクでの録音、聞き直し、サンプル評価、ふりかえりを体験できます。

**音声認識・発音評価APIは未接続です。第1案の星とコメントは表示例です。第2案では、API未接続のため採点済みの星を表示していません。録音はサーバーへ送信せず、ページ内で一時的に保持します。**

## 公開ページ

- [教材のトップ](https://naokitakahashi19.github.io/mpi-speaking-plus-mock/)
- [Talk](https://naokitakahashi19.github.io/mpi-speaking-plus-mock/talk.html)
- [About myself](https://naokitakahashi19.github.io/mpi-speaking-plus-mock/aboutmyself.html)

## 配信

`public/talk.html`と`public/aboutmyself.html`は、それぞれ動画・画像・音声・CSS・JavaScriptをすべて含む独立したHTMLファイルです。各ファイル1つで配信でき、教材内に切替ナビゲーションはありません。

`main`へのpushでGitHub ActionsからGitHub Pagesへ`public/`を配信します。S3＋CloudFrontにも、使いたいHTMLファイルだけを配置できます。

編集用ソースは`mock/`にあります。変更後は`python3 scripts/build_standalone.py`（Python 3とNode.jsが必要）で配信用ファイルを再生成します。

[教材の構成・LMS埋め込み手順](mock/README.md)

元教材素材はmpi英語プログラムのものです。このリポジトリは素材の再利用許諾やオープンソースライセンスを付与するものではありません。

## 第2案

元教材に近い画面遷移と、小学生向けのグラフィックを使った別案です。

- [Talk 第2案](https://naokitakahashi19.github.io/mpi-speaking-plus-mock/talk-v2.html)
- [About myself 第2案](https://naokitakahashi19.github.io/mpi-speaking-plus-mock/aboutmyself-v2.html)

本番と同じ見た目・操作に寄せ、確認用UIを取り除いています。「はなす」で録音し、「じぶんのこえ」で聞き直します。同じ問題で何度でも録り直し、直前の録音とも聞き比べできます。音声判定APIは未接続のため、採点済みの星は表示しません。

[第2案の構成と確認手順](mock-v2/README.md)

再生成：`python3 scripts/build_v2.py`
