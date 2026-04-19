import { ChapterSelector } from "./ChapterSelector";

const HERO_SCRIPTS = [
  ["hero-script hero-script-jp hero-script-1", "旅の記録 ・ 道 ・ 風景"],
  ["hero-script hero-script-th hero-script-2", "สวัสดี · การเดินทาง · บันทึก"],
  ["hero-script hero-script-ms hero-script-3", "Selamat Jalan · Catatan · Kenangan"],
  ["hero-script hero-script-jp hero-script-4", "列車の窓 ・ 雨 ・ 夜明け"],
  ["hero-script hero-script-th hero-script-5", "ตลาด · กลิ่นชา · เสียงรถไฟ"],
  ["hero-script hero-script-ms hero-script-6", "Rasa Jalanan · Hujan Tropika"],
  ["hero-script hero-script-jp hero-script-7", "古い地図 ・ 寄り道 ・ 記憶"],
  ["hero-script hero-script-th hero-script-8", "แม่น้ำ · ถนน · เรื่องเล่า"],
  ["hero-script hero-script-ms hero-script-9", "Laluan Lama · Cerita Baru"],
  ["hero-script hero-script-jp hero-script-10", "朝の駅 ・ 旅人 ・ 光"],
  ["hero-script hero-script-th hero-script-11", "รอยยิ้ม · เส้นทาง · เวลา"],
  ["hero-script hero-script-ms hero-script-12", "Selamat Datang · Jejak"],
  ["hero-script hero-script-jp hero-script-13", "港町 ・ 提灯 ・ 夜風"],
  ["hero-script hero-script-th hero-script-14", "อาหารริมทาง · สีสัน · เมืองเก่า"],
  ["hero-script hero-script-ms hero-script-15", "Pasar Malam · Bau Rempah"],
  ["hero-script hero-script-jp hero-script-16", "静かな寺 ・ 石畳 ・ 影"],
  ["hero-script hero-script-th hero-script-17", "ทะเล · ฝน · ความทรงจำ"],
  ["hero-script hero-script-ms hero-script-18", "Nadi Kota · Langkah Kaki"],
  ["hero-script hero-script-jp hero-script-19", "旅の途中 ・ 小さな奇跡"],
  ["hero-script hero-script-th hero-script-20", "รถสองแถว · ทางโค้ง · แสงเย็น"],
  ["hero-script hero-script-ms hero-script-21", "Cerita Jalan · Arah Selatan"],
  ["hero-script hero-script-jp hero-script-22", "山の霧 ・ 朝市 ・ 手紙"],
];

export function HeroPanel({
  documentTitle,
  chapters,
  currentSlug,
  isGalleryRoute,
  loading,
  onJumpToChapter,
}) {
  return (
    <section className="hero-panel" aria-label="Travel journal overview">
      <div className="hero-script-cloud" aria-hidden="true">
        {HERO_SCRIPTS.map(([className, text]) => (
          <span className={className} key={className}>
            {text}
          </span>
        ))}
      </div>

      <div className="hero-copy">
        <p className="kicker">
          <a className="hero-home-link" href="#" aria-label="Return to home page">
            Asia Overland Chronicle
          </a>
        </p>
        <h1>
          <a className="hero-title hero-home-link" href="#" aria-label="Return to home page">
            {documentTitle}
          </a>
        </h1>
      </div>

      <div className="hero-main-menu" role="group" aria-label="Primary navigation">
        <div className="hero-menu">
          <ChapterSelector
            chapters={chapters}
            currentSlug={currentSlug}
            isGalleryRoute={isGalleryRoute}
            loading={loading}
            onJumpToChapter={onJumpToChapter}
          />
          <button
            className={`hero-menu-button${isGalleryRoute ? " is-active" : ""}`}
            type="button"
            onClick={() => onJumpToChapter("gallery")}
          >
            All Photos
          </button>
        </div>
      </div>
    </section>
  );
}
