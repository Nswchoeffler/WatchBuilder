import type { ReactNode } from 'react';
import type { Build } from '../../domain/schemas';
import { useApp } from '../app/AppContext';
import { StatusBadge, useEvaluation, WatchStage } from '../common';

interface Props {
  build: Pick<Build, 'name' | 'slots' | 'flags'>;
  href?: string;
  meta?: ReactNode;
  selected?: boolean;
  select?: ReactNode;
  actions?: ReactNode;
}

export function BuildCard({ build, href, meta, selected, select, actions }: Props) {
  const { catalog } = useApp();
  const { report, parts, art } = useEvaluation(build, catalog);
  return (
    <article className={`build-card${selected ? ' selected' : ''}`}>
      {href && <a className="build-card-link" href={href} aria-label={`Open ${build.name}`} />}
      {select && <div className="build-card-select">{select}</div>}
      <WatchStage parts={parts} art={art} framing="head" title={build.name} />
      <div className="build-card-body">
        <div className="build-card-title">
          <h3>{build.name}</h3>
        </div>
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <StatusBadge status={report.status} />
          {meta && <span className="build-card-meta">{meta}</span>}
        </div>
      </div>
      {actions && <div className="build-card-actions">{actions}</div>}
    </article>
  );
}
