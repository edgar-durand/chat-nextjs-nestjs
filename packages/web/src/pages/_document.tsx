import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content="Real-time chat application" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
