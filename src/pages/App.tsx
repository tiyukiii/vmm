import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-white flex items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-6">

        <h1 className="text-3xl font-bold">В данный момент сайт не работает</h1>

        <p className="text-white/70">
          Хочу пояснить, почему этот проект остановлен.
          Идея сайта изначально была моей, но позже появился другой проект, созданный другим человеком, который развил эту идею дальше.
          Он действительно выполнен лучше — и по дизайну, и по общему качеству реализации.
        </p>

        <p className="text-white/70">
          Важно: человек, который создал похожий сайт, не имеет никакого отношения к решению закрыть этот.
          Это решение полностью моё. Я вижу, что многие вещи, которые мне самому не нравились в текущем дизайне и функционале,
          на новом сайте реализованы гораздо лучше.
        </p>

        <p className="text-white/70">
          Мне очень жаль, что я не оправдал ваших надежд и ожиданий от этого проекта.
          Это было грустное и тяжёлое решение — закрыть свой сайт, но я искренне верю, что так будет лучше для всех.
        </p>

        <p className="text-white/70">
          Пожалуйста, обращайтесь по поводу обновлений и развития проекта теперь к создателю нового сайта.
          А я тем временем возьму паузу, чтобы придумать и сделать что-то новое.
        </p>

        <p className="text-white/50 italic">
          See you again on other projects.<br />
          by @whyalive993
        </p>

        {/* Кнопка на новый сайт — подставь свою ссылку */}
        <a
          href="https://ifiwereyouu.netlify.app"
          target="_blank"
          rel="noreferrer"
          className="btn-primary inline-block px-6 py-3 mt-4"
        >
          Перейти на новый сайт
        </a>

      </div>
    </div>
  );
}
