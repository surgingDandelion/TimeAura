interface BootstrapScreenProps {
  mode: "loading" | "error";
  title?: string;
  detail?: string;
}

export function BootstrapScreen({
  mode,
  title = mode === "loading" ? "正在初始化 TimeAura Desktop…" : "应用初始化失败",
  detail = mode === "loading" ? "正在连接本地数据、AI 通道与桌面能力。" : "请检查本地运行环境后重试。",
}: BootstrapScreenProps): JSX.Element {
  return (
    <div className={`bootstrap-screen${mode === "error" ? " bootstrap-screen-error" : ""}`}>
      <div className="bootstrap-screen-content">
        <div className={`bootstrap-logo-stage${mode === "loading" ? " bootstrap-logo-stage-loading" : ""}`} aria-hidden="true">
          <svg className="bootstrap-logo" viewBox="0 0 340 340" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="44" y="34" width="252" height="252" rx="72" fill="white" fillOpacity="0.9" />
            <rect x="76" y="66" width="188" height="188" rx="54" fill="url(#bootstrapBlue)" />
            <path d="M125 117H215" stroke="white" strokeWidth="19" strokeLinecap="round" />
            <path d="M170 117V208" stroke="white" strokeWidth="19" strokeLinecap="round" />
            <path d="M170 208L215 117" stroke="#DDEBFF" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="170" cy="151" r="57" className="bootstrap-orbit" />
            <g className="bootstrap-orbit-dot">
              <circle cx="215" cy="117" r="7" fill="#E7A25E" />
            </g>
            <defs>
              <linearGradient id="bootstrapBlue" x1="82" y1="58" x2="262" y2="270" gradientUnits="userSpaceOnUse">
                <stop stopColor="#9AC0EB" />
                <stop offset="1" stopColor="#436CA6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="bootstrap-copy">
          <div className="bootstrap-kicker">TIMEAURA DESKTOP</div>
          <div className="bootstrap-title">{title}</div>
          <div className="bootstrap-detail">{detail}</div>
        </div>
      </div>
    </div>
  );
}
