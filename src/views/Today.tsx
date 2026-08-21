import { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { buildReady, farmByMission, farmTargets, huntList, levelUpQueue, masteredToday, openableRelics, sourceLabel, tally } from '../lib/selectors';
import { CATEGORY_LABEL, MASTERY_GEAR, relicSources } from '../lib/gameData';
import { MR30_XP, extrasXp, fmt, gearXp, mrFromXp, mrThreshold, remainingGearXp, totalXp } from '../lib/mastery';
import { Icon } from '../components/Icon';
import { PrimeArt } from '../components/PrimeArt';
import { SyncButton } from '../components/SyncButton';
import { TargetStar } from '../components/TargetStar';
import type { MasteryItem, Refinement } from '../types';

const REFINEMENT_ES: Record<Refinement, string> = {
  Intact: 'intacta',
  Exceptional: 'excepcional',
  Flawless: 'impecable',
  Radiant: 'radiante',
};

const REF_ORDER: Refinement[] = ['Radiant', 'Flawless', 'Exceptional', 'Intact'];

function stockLabel(states: Partial<Record<Refinement, number>>): string {
  return REF_ORDER.filter((r) => (states[r] ?? 0) > 0)
    .map((r) => `×${states[r]} ${REFINEMENT_ES[r]}`)
    .join(' · ');
}

export function Today({ onOpenPrime }: { onOpenPrime: (name: string) => void }) {
  const { progress, dispatch } = useStore();
  const [farmMode, setFarmMode] = useState<'mission' | 'part'>('mission');
  const [openMission, setOpenMission] = useState<string | null>(null);

  const t = useMemo(() => tally(progress), [progress]);
  const openable = useMemo(() => openableRelics(progress), [progress]);
  const missions = useMemo(() => farmByMission(progress), [progress]);
  const byPart = useMemo(() => farmTargets(progress).slice(0, 12), [progress]);
  const builds = useMemo(() => buildReady(progress), [progress]);
  const hunts = useMemo(() => huntList(progress), [progress]);
  const levelUp = useMemo(() => levelUpQueue(progress), [progress]);
  // Lo que marcas hoy se queda a la vista y tachado, no se desvanece bajo el
  // cursor: si le diste sin querer, un segundo clic lo revierte. Sale del
  // registro, así que aguanta recargas y se limpia solo mañana.
  const levelledToday = useMemo(() => masteredToday(progress), [progress]);
  const markLevelled = (name: string, mastered: boolean) =>
    dispatch({ type: 'setMastered', itemName: name, mastered });

  const xp = totalXp(progress);
  const mr = mrFromXp(xp);
  const next = mrThreshold(mr + 1);
  const pct = Math.min(100, (xp / MR30_XP) * 100);
  const toMr30 = Math.max(0, MR30_XP - xp);
  const remaining = remainingGearXp(progress);

  const collDone = t.mastered + t.built + t.ready;
  const openParts = openable.reduce((n, r) => n + r.yields.length, 0);
  const buildXp = builds.reduce((n, b) => n + b.xp, 0);
  const levelUpXp = levelUp.reduce((n, g) => n + g.xp, 0);
  /**
   * Las 12 filas de la sección. El truco está en armar UN pool con lo
   * pendiente más lo que marcaste hoy y recortar a 12 al final: así el ítem
   * que marcas conserva su sitio y no entra otro a ocupar el hueco. Recortar
   * antes de sumar lo marcado hacía crecer la lista en cada clic.
   */
  const levelUpShown = useMemo(() => {
    const pool = new Map<string, MasteryItem>();
    for (const g of levelUp) pool.set(g.name, g);
    for (const name of levelledToday) {
      // solo lo que tienes en el arsenal: es la premisa de la sección
      if (!progress.built[name] || pool.has(name)) continue;
      const g = MASTERY_GEAR.find((x) => x.name === name);
      if (g) pool.set(name, g);
    }
    return [...pool.values()]
      .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name))
      .slice(0, 12);
  }, [levelUp, levelledToday, progress.built]);

  // pendientes que no caben en las 12 filas (las ya marcadas ocupan sitio)
  const morePending = levelUp.length - levelUpShown.filter((g) => !progress.mastered[g.name]).length;

  const segs = [
    { label: 'Masterizados', n: t.mastered, c: 'var(--gold)' },
    { label: 'Construidos', n: t.built, c: 'var(--teal)' },
    { label: 'Piezas listas', n: t.ready, c: 'var(--blue)' },
    { label: 'En progreso', n: t.partial, c: '#4a4a55' },
    { label: 'Faltantes', n: t.missing, c: '#24242c' },
  ];

  return (
    <div className="stack">
      {/* ── las dos metas, una por objetivo real ─────────────── */}
      <div className="goals">
        <section className="card card--inlay card--tick goal rise">
          <div className="goal-h">
            <span className="k">Meta 01 · colección prime</span>
            <span className="pct n">{((collDone / Math.max(1, t.total)) * 100).toFixed(1)}%</span>
          </div>
          <div className="goal-v">
            <b className="n">{collDone}</b>
            <s className="n">/ {t.total}</s>
            <em>
              {t.total - collDone} pendientes
              <br />
              {fmt(t.partsOwned)} de {fmt(t.partsTotal)} piezas
            </em>
          </div>
          <div className="segbar">
            {segs.map((s) => (
              <i key={s.label} style={{ flexGrow: s.n, background: s.c }} />
            ))}
          </div>
          <div className="legend">
            {segs.map((s) => (
              <span key={s.label}>
                <i style={{ background: s.c }} />
                {s.label} <b className="n">{s.n}</b>
              </span>
            ))}
          </div>
        </section>

        <section className="card card--inlay card--tick goal goal--teal rise" style={{ animationDelay: '60ms' }}>
          <div className="goal-h">
            <span className="k">Meta 02 · mastery rank 30</span>
            <span className="pct n">{pct.toFixed(1)}%</span>
          </div>
          <div className="goal-v">
            <b className="n">MR {mr}</b>
            <em>
              {fmt(xp)} / {fmt(MR30_XP)} XP
              <br />
              faltan {fmt(toMr30)} · {fmt(Math.max(0, next - xp))} para MR {mr + 1}
            </em>
          </div>
          <div className="bar bar--teal">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div className="goal-note">
            <Icon
              name={toMr30 <= remaining ? 'check' : 'alert'}
              size={15}
              color={toMr30 <= remaining ? 'var(--teal)' : 'var(--red)'}
              width={1.7}
            />
            <span>
              {toMr30 <= remaining ? (
                <>
                  Te quedan <b className="n" style={{ color: 'var(--teal)' }}>{fmt(remaining)} XP</b> en equipo sin
                  masterizar — la meta es alcanzable solo con eso.
                </>
              ) : (
                <>
                  El equipo pendiente da <b className="n">{fmt(remaining)} XP</b>: necesitarás también star chart e
                  intrínsecos.
                </>
              )}
            </span>
          </div>
        </section>
      </div>

      {/* ── 00 · lo que estás buscando ahora ──────────────────── */}
      {hunts.length > 0 ? (
        <section className="card card--inlay sect rise" style={{ animationDelay: '90ms' }}>
          <div className="sect-h">
            <span className="sect-n">00</span>
            <div>
              <div className="sect-t">Lo que estás buscando ahora</div>
              <div className="sect-s">tus objetivos marcados, con la ruta completa para cada uno</div>
            </div>
            <div className="sect-r">
              <span className="badge badge--mastered">{hunts.length} en la mira</span>
            </div>
          </div>

          <div className="hunts">
            {hunts.map((h) => (
              <article key={h.prime.name} className={`hunt hunt--${h.status}`}>
                <div className="hunt-h">
                  <button className="hunt-open" onClick={() => onOpenPrime(h.prime.name)}>
                    <PrimeArt
                      image={h.prime.image}
                      category={h.prime.category}
                      size={20}
                      imgClass="hunt-art"
                      glyphClass="hunt-ico"
                    />
                    <span className="hunt-n">
                      <b>{h.prime.name}</b>
                      <span>
                        {CATEGORY_LABEL[h.prime.category] ?? h.prime.category} ·{' '}
                        {h.prime.founders ? 'Founders' : h.prime.farmable ? 'farmeable hoy' : 'en el Vault'}
                      </span>
                    </span>
                  </button>
                  <span className="hunt-c n">
                    {h.owned}/{h.total}
                  </span>
                  <TargetStar primeName={h.prime.name} size={15} />
                </div>

                {h.total > 0 && (
                  <div className="pips" aria-hidden>
                    {Array.from({ length: h.total }, (_, k) => (
                      <i key={k} className={k < h.owned ? 'is-full' : ''} />
                    ))}
                  </div>
                )}

                {/* qué sigue: la respuesta corta, antes del detalle */}
                <div className="hunt-verdict">
                  {h.status === 'mastered' ? (
                    <>
                      <Icon name="check" size={14} width={1.8} color="var(--gold)" />
                      <span>Ya lo tienes masterizado. Puedes quitarlo de la lista.</span>
                    </>
                  ) : h.status === 'built' ? (
                    <>
                      <Icon name="star" size={14} width={1.8} color="var(--teal)" />
                      <span>
                        Construido — súbelo a rango máximo para reclamar{' '}
                        <b className="n">{h.xp ? fmt(h.xp) : '—'} XP</b>.
                      </span>
                    </>
                  ) : h.status === 'ready' ? (
                    <>
                      <Icon name="hammer" size={14} width={1.8} color="var(--teal)" />
                      <span>
                        Tienes las {h.total} piezas — constrúyelo y son <b className="n">{fmt(h.xp)} XP</b>.
                      </span>
                    </>
                  ) : h.prime.founders ? (
                    <>
                      <Icon name="alert" size={14} width={1.8} color="var(--red)" />
                      <span>Founders: no se puede conseguir por ningún medio.</span>
                    </>
                  ) : h.vaultedSteps === h.steps.length ? (
                    /* En el Vault sus reliquias no caen: decir "toca farmear"
                       sería mentira, no hay dónde. */
                    <>
                      <Icon name="alert" size={14} width={1.8} color="var(--red)" />
                      <span>
                        En el Vault: ninguna de sus reliquias cae ahora mismo. Solo por intercambio con otro Tenno, o
                        esperando a que lo desvaulteen.
                      </span>
                    </>
                  ) : h.usableRelics.length > 0 ? (
                    <>
                      <Icon name="check" size={14} width={1.8} color="var(--teal)" />
                      <span>
                        Sin farmear: <b style={{ color: 'var(--teal)' }}>{h.usableRelics.join(', ')}</b> ya{' '}
                        {h.usableRelics.length === 1 ? 'está' : 'están'} en tu inventario.
                        {h.vaultedSteps > 0 && ` Ojo: ${h.vaultedSteps} pieza(s) solo salen por intercambio.`}
                      </span>
                    </>
                  ) : (
                    <>
                      <Icon name="alert" size={14} width={1.8} color="var(--red)" />
                      <span>
                        Toca farmear: no tienes ninguna de sus reliquias.
                        {h.vaultedSteps > 0 && ` ${h.vaultedSteps} pieza(s) están en el Vault.`}
                      </span>
                    </>
                  )}
                </div>

                {h.steps.length > 0 && (
                  <div className="hunt-steps">
                    {h.steps.map((s) => (
                      <div key={s.component.fullName} className={`hstep ${s.owned > 0 ? 'is-mine' : ''}`}>
                        <span className="hs-part">
                          {s.component.name}
                          {s.missing > 1 && <em className="n"> ×{s.missing}</em>}
                        </span>
                        {s.ref ? (
                          <>
                            <span className="hs-relic">
                              <i className={`dot dot--${s.ref.rarity.toLowerCase()}`} />
                              {s.ref.relic}
                              {s.owned > 0 && <em className="have">×{s.owned}</em>}
                            </span>
                            <span className="hs-src">
                              {s.ref.active ? sourceLabel(s.source) : 'reliquia en vault'}
                            </span>
                            <span className="hs-pct n">{(s.ref.chances.Radiant ?? 0).toFixed(1)}%</span>
                          </>
                        ) : (
                          <>
                            <span className="hs-relic faint">sin reliquia activa</span>
                            <span className="hs-src faint">en el Vault — solo por intercambio</span>
                            <span className="hs-pct faint">—</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className="hunt-hint">
          <Icon name="star" size={14} width={1.6} />
          <span>
            ¿Andas detrás de algo puntual? Dale a la estrella en cualquier prime y aparecerá aquí arriba con la ruta
            completa para conseguirlo.
          </span>
        </div>
      )}

      {/* ── 01 · abre lo que ya tienes ────────────────────────── */}
      <section className="card card--inlay sect rise" style={{ animationDelay: '120ms' }}>
        <div className="sect-h">
          <span className="sect-n">01</span>
          <div>
            <div className="sect-t">Abre ahora</div>
            <div className="sect-s">reliquias que ya tienes y contienen piezas que te faltan — no hay que farmear nada</div>
          </div>
          <div className="sect-r">
            {openable.length > 0 && (
              <span className="badge badge--built">
                {openable.length} reliquias · {openParts} piezas
              </span>
            )}
          </div>
        </div>

        {openable.length === 0 ? (
          <div className="empty">
            {Object.keys(progress.relics).length === 0 ? (
              <>
                <p>Aún no hay inventario de reliquias.</p>
                <p className="faint" style={{ marginTop: 6, marginBottom: 14 }}>
                  Sincroniza tu <code>lastData.dat</code> de AlecaFrame y esta sección te dirá qué puedes abrir hoy.
                </p>
                <SyncButton variant="full" />
              </>
            ) : (
              <p>Ninguna reliquia de tu inventario da piezas que te falten. Toca farmear.</p>
            )}
          </div>
        ) : (
          <div className="rows">
            {openable.slice(0, 10).map((r) => (
              <div key={r.relic} className="orow">
                <span className="relicbox">
                  <span className="relicglyph">
                    <Icon name="relic" size={17} color="var(--gold)" width={1.4} />
                  </span>
                  <span>
                    <span className="rname">{r.relic}</span>
                    <span className="rmeta">{stockLabel(r.states)}</span>
                  </span>
                </span>
                <span className="parts">
                  {/* ordenadas por probabilidad radiante: las primeras son las que valen */}
                  {r.yields.slice(0, 4).map((y) => (
                    <button
                      key={y.component.fullName}
                      className="ppill"
                      onClick={() => onOpenPrime(y.prime.name)}
                      title={`Abrir ${y.prime.name}`}
                    >
                      <i className={`dot dot--${y.ref.rarity.toLowerCase()}`} />
                      <b>
                        {y.prime.name} {y.component.name}
                      </b>
                      <span className="n">{(y.ref.chances.Radiant ?? 0).toFixed(1)}%</span>
                    </button>
                  ))}
                  {r.yields.length > 4 && (
                    <span className="ppill ppill--more">+{r.yields.length - 4} piezas más</span>
                  )}
                </span>
              </div>
            ))}
            {openable.length > 10 && (
              <div className="rows-more faint">+ {openable.length - 10} reliquias más en tu inventario sirven</div>
            )}
          </div>
        )}
      </section>

      <div className="split">
        {/* ── 02 · farmea lo que falta ───────────────────────── */}
        <section className="card sect rise" style={{ animationDelay: '160ms' }}>
          <div className="sect-h">
            <span className="sect-n">02</span>
            <div>
              <div className="sect-t">Farmea reliquias</div>
              <div className="sect-s">
                {farmMode === 'mission'
                  ? 'una entrada por misión: qué ganas con ir, no cuántas veces se repite el destino'
                  : 'una entrada por pieza, con la mejor reliquia activa de cada una'}
              </div>
            </div>
            <div className="sect-r">
              <div className="seg" role="group" aria-label="Agrupar farmeo">
                <button
                  className={farmMode === 'mission' ? 'is-on' : ''}
                  onClick={() => setFarmMode('mission')}
                  aria-pressed={farmMode === 'mission'}
                >
                  Por misión
                </button>
                <button
                  className={farmMode === 'part' ? 'is-on' : ''}
                  onClick={() => setFarmMode('part')}
                  aria-pressed={farmMode === 'part'}
                >
                  Por pieza
                </button>
              </div>
            </div>
          </div>

          {farmMode === 'mission' ? (
            missions.length === 0 ? (
              <div className="empty">Nada farmeable pendiente — o ya lo tienes todo, Tenno.</div>
            ) : (
              <div className="rows">
                {missions.slice(0, 8).map((m) => {
                  const open = openMission === m.key;
                  return (
                    <div key={m.key}>
                      <button
                        className={`frow ${open ? 'is-open' : ''}`}
                        onClick={() => setOpenMission(open ? null : m.key)}
                        aria-expanded={open}
                      >
                        <Icon name="chevron" size={14} width={2} className="caret" />
                        <span className="fwhere">
                          <b>
                            {m.wheres[0]}
                            {m.wheres.length > 1 && (
                              <em className="alt">+{m.wheres.length - 1} nodos igual de buenos</em>
                            )}
                          </b>
                          <span>
                            {[m.mode, m.rot ? `Rotación ${m.rot}` : '', m.stage].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className="fcov">
                          te sirven <b className="n">{m.relics.length}</b> reliquias
                          <br />
                          cubren <b className="n">{m.covers}</b> piezas
                        </span>
                        <span className="fpct n">{m.chance.toFixed(1)}%</span>
                      </button>
                      {open && (
                        <div className="fdet">
                          {m.wheres.length > 1 && (
                            <div className="drow nodes">
                              <span className="rn">Sirve cualquiera</span>
                              <span className="dp">{m.wheres.join(' · ')}</span>
                            </div>
                          )}
                          {m.relics.map((r) => (
                            <div key={r.relic} className="drow">
                              <span className="rn">
                                <i className={`dot dot--${r.rarity.toLowerCase()}`} />
                                {r.relic}
                                {r.owned > 0 && <em className="have">×{r.owned}</em>}
                              </span>
                              <span className="dp">
                                te da{' '}
                                {r.parts.map((p, i) => (
                                  <span key={p.label}>
                                    {i > 0 && ' · '}
                                    <button className="dlink" onClick={() => onOpenPrime(p.primeName)}>
                                      {p.label}
                                    </button>
                                  </span>
                                ))}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {missions.length > 8 && (
                  <div className="rows-more faint">+ {missions.length - 8} misiones más con reliquias que te sirven</div>
                )}
              </div>
            )
          ) : byPart.length === 0 ? (
            <div className="empty">Nada farmeable pendiente — o ya lo tienes todo, Tenno.</div>
          ) : (
            <div className="rows">
              {byPart.map((ft) => (
                <button key={ft.component.fullName} className="frow" onClick={() => onOpenPrime(ft.prime.name)}>
                  <i className={`dot dot--${ft.relic.rarity.toLowerCase()}`} style={{ marginLeft: 4 }} />
                  <span className="fwhere">
                    <b>{ft.component.fullName}</b>
                    <span>
                      {ft.relic.relic} · {sourceLabel(relicSources(ft.relic.relic)[0])}
                    </span>
                  </span>
                  <span className="fcov">
                    faltan <b className="n">{ft.missing}</b>
                    {ft.owned > 0 && (
                      <>
                        <br />
                        <em className="have">tienes {ft.owned}</em>
                      </>
                    )}
                  </span>
                  <span className="fpct n">{(ft.relic.chances.Radiant ?? 0).toFixed(1)}%</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── 03 · construye lo que ya se puede ──────────────── */}
        <section className="card sect rise" style={{ animationDelay: '200ms' }}>
          <div className="sect-h">
            <span className="sect-n">03</span>
            <div>
              <div className="sect-t">Listos para construir</div>
              <div className="sect-s">tienes todas las piezas — cada uno es mastery esperando en la foundry</div>
            </div>
            <div className="sect-r">
              {buildXp > 0 && <span className="badge badge--mastered">+{fmt(buildXp)} XP</span>}
            </div>
          </div>

          {builds.length === 0 ? (
            <div className="empty">Ningún prime tiene todas las piezas todavía.</div>
          ) : (
            <div className="rows">
              {builds.slice(0, 10).map((b) => (
                <button key={b.prime.name} className="brow" onClick={() => onOpenPrime(b.prime.name)}>
                  <PrimeArt
                    image={b.prime.image}
                    category={b.prime.category}
                    size={17}
                    imgClass="bico-art"
                    glyphClass="bico"
                  />
                  <span className="bname">
                    <b>{b.prime.name}</b>
                    <span>
                      {CATEGORY_LABEL[b.prime.category] ?? b.prime.category} · {b.prime.components.length} piezas listas
                    </span>
                  </span>
                  <span className="bxp n">{b.xp ? `+${fmt(b.xp)} XP` : '—'}</span>
                </button>
              ))}
              {builds.length > 10 && (
                <div className="rows-more faint">+ {builds.length - 10} más listos para construir</div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ── 04 · sube de rango lo que ya tienes ───────────────── */}
      <section className="card sect rise" style={{ animationDelay: '220ms' }}>
        <div className="sect-h">
          <span className="sect-n">04</span>
          <div>
            <div className="sect-t">Sube de rango lo que ya tienes</div>
            <div className="sect-s">
              está en tu arsenal sin llegar a rango máximo — es XP de maestría sin farmear nada
            </div>
          </div>
          <div className="sect-r">
            {levelUp.length > 0 && <span className="badge badge--mastered">+{fmt(levelUpXp)} XP</span>}
          </div>
        </div>

        {/* `levelUpShown`, no `levelUp`: al marcar el último pendiente la fila
            debe seguir ahí para poder deshacer. */}
        {levelUpShown.length === 0 ? (
          <div className="empty">
            {Object.keys(progress.built).length === 0 ? (
              <>
                <p>Aún no sabemos qué tienes en el arsenal.</p>
                <p className="faint" style={{ marginTop: 6, marginBottom: 14 }}>
                  Sincroniza tu <code>lastData.dat</code> y aquí saldrá todo el equipo que ya tienes sin subir a rango
                  máximo — donde está el 77 % del XP que falta para MR 30.
                </p>
                <SyncButton variant="full" />
              </>
            ) : (
              <p>Todo lo que tienes en el arsenal ya está masterizado. Toca conseguir equipo nuevo.</p>
            )}
          </div>
        ) : (
          <>
            <div className="lgrid">
              {levelUpShown.map((g) => {
                const done = !!progress.mastered[g.name];
                return (
                  <button
                    key={g.name}
                    className={`lrow ${done ? 'is-done' : ''}`}
                    onClick={() => markLevelled(g.name, !done)}
                    title={
                      done
                        ? `Deshacer: ${g.name} volvería a contar como pendiente`
                        : `Marcar ${g.name} como masterizado (${fmt(g.xp)} XP)`
                    }
                    aria-pressed={done}
                  >
                    <span className="lcheck">
                      <Icon name="check" size={10} width={3} />
                    </span>
                    <span className="lname">
                      <b>{g.name}</b>
                      <span>
                        {done
                          ? 'masterizado · clic para deshacer'
                          : `${CATEGORY_LABEL[g.category] ?? g.category} · rango ${g.cap}`}
                      </span>
                    </span>
                    <span className="lxp n">+{fmt(g.xp)}</span>
                  </button>
                );
              })}
            </div>
            {morePending > 0 && (
              <div className="foot" style={{ marginTop: 12 }}>
                <Icon name="info" size={14} width={1.6} />
                <span>
                  Y {morePending} más en tu arsenal. La lista completa, con filtros, está en la pestaña Maestría.
                </span>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── desglose de XP: se conserva del panel anterior ────── */}
      <section className="card sect rise" style={{ animationDelay: '240ms' }}>
        <div className="sect-h">
          <div>
            <div className="sect-t">Desglose de mastery XP</div>
            <div className="sect-s">de dónde sale y de dónde puede salir lo que falta</div>
          </div>
        </div>
        <div className="rows">
          <div className="mrx-row">
            <span>Equipo masterizado</span>
            <span className="n">{fmt(gearXp(progress))} XP</span>
          </div>
          <div className="mrx-row">
            <span>Star chart · junctions · intrínsecos</span>
            <span className="n">{fmt(extrasXp(progress.extras))} XP</span>
          </div>
          <div className="mrx-row">
            <span>Disponible en equipo sin masterizar</span>
            <span className="n" style={{ color: 'var(--teal)' }}>
              +{fmt(remaining)} XP
            </span>
          </div>
          <div className="mrx-row">
            <span>Restante hasta MR 30</span>
            <span className="n">{fmt(toMr30)} XP</span>
          </div>
        </div>
      </section>

      <div className="foot">
        <Icon name="info" size={14} width={1.6} />
        <span>
          Los porcentajes son por apertura de reliquia radiante. Las tres secciones van en orden de esfuerzo: abrir lo
          que ya tienes, farmear lo que falta, construir lo que ya se puede.
        </span>
      </div>
    </div>
  );
}
