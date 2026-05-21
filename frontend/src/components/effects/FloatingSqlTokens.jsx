import { memo } from "react";

const TOKENS = [
  { label: "SELECT", x: "7%", y: "28%", delay: "0s", duration: "26s", drift: "16px", rotate: "1.6deg" },
  { label: "JOIN", x: "84%", y: "22%", delay: "2.4s", duration: "28s", drift: "-14px", rotate: "-1.3deg" },
  { label: "WHERE", x: "12%", y: "82%", delay: "1.2s", duration: "30s", drift: "16px", rotate: "1.6deg" },
  { label: "COUNT()", x: "72%", y: "74%", delay: "3.2s", duration: "27s", drift: "-14px", rotate: "-1.3deg" },
  { label: "AVG()", x: "48%", y: "14%", delay: "4.4s", duration: "31s", drift: "16px", rotate: "1.6deg" },
  { label: "GROUP BY", x: "61%", y: "45%", delay: "1.7s", duration: "29s", drift: "-14px", rotate: "-1.3deg" },
  { label: "{}", x: "24%", y: "50%", delay: "5.1s", duration: "25s", drift: "16px", rotate: "1.6deg" },
  { label: ";", x: "92%", y: "58%", delay: "0.8s", duration: "24s", drift: "-14px", rotate: "-1.3deg" },
];

function FloatingSqlTokens() {
  return (
    <div className="ambient-sql-tokens">
      {TOKENS.map((token) => (
        <span
          key={`${token.label}-${token.x}`}
          className="ambient-sql-token"
          style={{
            left: token.x,
            top: token.y,
            "--token-drift": token.drift,
            "--token-rotate": token.rotate,
            "--token-delay": token.delay,
            "--token-duration": token.duration,
          }}
        >
          {token.label}
        </span>
      ))}
    </div>
  );
}

export default memo(FloatingSqlTokens);
