import { Reveal } from "../ui/primitives";
import { eduLevelColor, type EduLevelKey } from "../../data/students";

interface Props {
  onSelect: (level: EduLevelKey) => void;
}

const nodes = [
  { key: "preprimary" as const, x: 20, y: 145, title: "PP1", meta: "Pre-Primary · age ~4" },
  { key: "primary" as const, x: 220, y: 145, title: "Grade 6", meta: "KPSEA · Oct/Nov" },
  { key: "junior" as const, x: 420, y: 145, title: "Grade 9", meta: "KJSEA · Oct/Nov" },
  { key: "senior" as const, x: 620, y: 145, title: "Grade 12", meta: "KSSEA · Oct/Nov" },
  { key: "university" as const, x: 830, y: 35, title: "University", meta: "Bachelor's → PhD" },
  { key: "tvet" as const, x: 830, y: 265, title: "TVET", meta: "Artisan → Higher Diploma" },
];

const lines = [
  "M170 188H215",
  "M370 188H415",
  "M570 188H615",
  "M770 188C800 188 795 78 825 78",
  "M770 188C800 188 795 308 825 308",
];

export function EducationPathway({ onSelect }: Props) {
  return (
    <Reveal className="pathway-scene">
      <div className="pathway-shell">
        <div className="pathway-scroll">
          <svg className="pathway-svg" viewBox="0 0 1000 390" role="img" aria-labelledby="pathway-title pathway-desc">
            <title id="pathway-title">The Kenyan education pathway supported by Learnly</title>
            <desc id="pathway-desc">
              PP1 progresses through Grade 6 KPSEA, Grade 9 KJSEA and Grade 12 KSSEA, then branches to University or TVET. Select a stage to see its details.
            </desc>
            <defs>
              <marker id="levels-pathway-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 10 5 0 10Z" fill="var(--text-tertiary)" />
              </marker>
            </defs>

            {lines.map((d, i) => (
              <path
                key={d}
                d={d}
                pathLength={1}
                className="pathway-line"
                style={{ ["--draw-delay" as string]: `${i * 130}ms` }}
                fill="none"
                stroke="var(--text-tertiary)"
                strokeWidth={2.5}
                strokeLinecap="round"
                markerEnd="url(#levels-pathway-arrow)"
              />
            ))}

            <text x="800" y="204" textAnchor="middle" className="pathway-meta" style={{ fontWeight: 700, letterSpacing: "0.12em" }}>
              OR
            </text>

            {nodes.map((node) => (
              <g
                key={node.key}
                className="pathway-node"
                role="button"
                tabIndex={0}
                aria-label={`Open ${node.title} level breakdown`}
                onClick={() => onSelect(node.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(node.key);
                  }
                }}
              >
                <rect x={node.x} y={node.y} width={150} height={86} rx={14} fill="var(--surface-1)" stroke={eduLevelColor(node.key)} strokeWidth={2.5} />
                <rect x={node.x} y={node.y} width={7} height={86} rx={3.5} fill={eduLevelColor(node.key)} />
                <text x={node.x + 20} y={node.y + 36} className="pathway-label">
                  {node.title}
                </text>
                <text x={node.x + 20} y={node.y + 60} className="pathway-meta">
                  {node.meta}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3" style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontSize: "var(--fs-sm)" }}>
          <span>Select any stage to open its full breakdown.</span>
          <span className="font-mono" style={{ fontSize: "var(--fs-label)", color: "var(--text-tertiary)" }}>
            CBC → KSSEA → University / TVET
          </span>
        </div>
      </div>
    </Reveal>
  );
}
