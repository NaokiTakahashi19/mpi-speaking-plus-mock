# mpi speaking plus モック

小学生向けの英語スピーキング教材のモックです。HTML・CSS・JavaScriptだけで動きます。

- **Talk / Lesson005**：Where’re you from? / I’m from Japan.
- **About myself / Lesson1**：Hi. / My name is Reina. / Thank you.

元教材の動画・音声、マイクでの録音、聞き直し、サンプル評価、ふりかえりを体験できます。

**音声認識・発音評価APIは未接続です。星とコメントは表示例で、録音した声の採点結果ではありません。録音はサーバーへ送信せず、ページ内で一時的に保持します。**

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
