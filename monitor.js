/** A read-only graphical dashboard for the Bitburner tail window. */
const gates = [["CyberSec", "CSEC"], ["NiteSec", "avmnite-02h"], ["The Black Hand", "I.I.I.I"], ["BitRunners", "run4theh111z"]];
const programs = [["BruteSSH.exe", 5e5], ["FTPCrack.exe", 1.5e6], ["relaySMTP.exe", 5e6], ["HTTPWorm.exe", 3e7], ["SQLInject.exe", 25e7]];
const palette = { ink: "#eaf1f7", muted: "#afbece", mint: "#72e5bf", blue: "#87baff", gold: "#f5c878", panel: "#172330", line: "#354859" };
const fmt = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
const cash = value => "$" + fmt.format(value);
const rate = value => cash(value) + "/s";
const sum = (items, pick) => items.reduce((total, item) => total + pick(item), 0);

function snapshot(ns) {
  const paths = new Map([["home", ["home"]]]);
  for (const [host, path] of paths) {
    for (const peer of ns.scan(host)) if (!paths.has(peer)) paths.set(peer, [...path, peer]);
  }
  const hosts = Array.from(paths, ([name, path]) => ({
    name, path, ...ns.getServer(name), processes: ns.ps(name),
    files: ns.ls(name, ".cct").filter(file => file.endsWith(".cct")),
  }));
  const network = hosts.filter(host => host.name !== "darkweb");
  const processes = hosts.flatMap(host => host.processes);
  const controller = processes.find(p => p.filename === "cycle.js");
  const name = controller ? String(controller.args[0] ?? "sigma-cosmetics") : null;
  const target = hosts.find(host => host.name === name);
  const workers = processes.filter(p => p.filename === "task.js" && p.args[1] === name);
  const phase = workers[0]?.args[0] ?? (controller ? "waiting" : "idle");
  const player = ns.getPlayer();
  const home = hosts.find(host => host.name === "home");
  const owned = programs.filter(([file]) => ns.fileExists(file, "home"));
  const nodes = ns.hacknet.numNodes();
  const hacknet = sum(Array.from({length: nodes}, (_, i) => ns.hacknet.getNodeStats(i)), n => n.production);
  const times = target ? [ns.getHackTime(name), ns.getGrowTime(name), ns.getWeakenTime(name)] : [];
  return { time: Date.now(), hosts: network, home, target, phase, player, owned, nodes, hacknet, times,
    income: ns.getTotalScriptIncome(), processes, workers, controller,
    rooted: network.filter(h => h.hasAdminRights).length,
    ram: sum(network, h => h.hasAdminRights ? h.maxRam : 0),
    used: sum(network, h => h.hasAdminRights ? h.ramUsed : 0),
    contracts: hosts.flatMap(h => h.files.map(file => ({file, host: h.name}))),
    shares: sum(processes.filter(p => p.filename === "share.js"), p => p.threads),
    scanner: processes.some(p => p.filename === "contracts.js"),
  };
}

const h = (...args) => React.createElement(...args);
const box = (style, ...children) => h("div", {style}, ...children);
const small = text => box({color: palette.muted, fontSize: 13, lineHeight: 1.5}, text);
const label = text => box({fontSize: 11, color: palette.muted, letterSpacing: ".1em", fontWeight: 700, textTransform: "uppercase"}, text);
const digits = (text, color = palette.ink) => box({fontSize: 30, fontWeight: 700, color, fontVariantNumeric: "tabular-nums"}, text);
const grid = (...items) => box({display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(235px,100%),1fr))", gap: 12}, ...items);
const card = (title, ...children) => box({background: palette.panel, border: "1px solid " + palette.line, borderRadius: 12, padding: 16, display: "grid", alignContent: "start", gap: 9}, label(title), ...children);
const bar = (value, max, color) => box({height: 7, background: "#304051", borderRadius: 4, overflow: "hidden"},
  box({height: "100%", width: Math.min(100, Math.max(0, max ? 100 * value / max : 0)) + "%", background: color}));
const phases = {
  weaken: ["Lowering security", "Workers are making the next hack easier.", palette.blue],
  grow: ["Refilling the target", "Workers are putting money back so the next hack can pay out.", palette.gold],
  hack: ["Collecting money", "Workers are trying to transfer money to your balance.", palette.mint],
  waiting: ["Between operations", "The controller is checking the target before assigning its next job.", palette.blue],
  idle: ["Controller offline", "Start cycle.js on home to coordinate the network.", palette.gold],
};
function balanceChart(history) {
  if (history.length < 2) return small("Collecting the first balance samples…");
  const values = history.map(p => p.cash);
  const low = Math.min(...values), high = Math.max(...values);
  const first = history[0], last = history[history.length - 1];
  const points = history.map(p => {
    const x = 3 + 494 * (p.time - first.time) / Math.max(1, last.time - first.time);
    const y = high === low ? 40 : 75 - 68 * (p.cash - low) / (high - low);
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  return box({}, h("svg", {viewBox: "0 0 500 82", preserveAspectRatio: "none", style: {width:"100%", height:76}, role:"img", "aria-label":"Cash balance over the sampled period"},
    h("polygon", {points:"3,81 " + points + " 497,81",fill:"#24463f"}),
    h("polyline", {points, fill:"none", stroke:palette.mint, strokeWidth:2.5, vectorEffect:"non-scaling-stroke"})),
    small(Math.round((last.time-first.time)/1000) + " seconds shown · Range " + cash(low) + " – " + cash(high)));
}
function operation(d) {
  const [title, description, color] = phases[d.phase] ?? phases.waiting;
  const t = d.target;
  return card("Hacking cycle", digits(title, color), small(description),
    box({display:"flex", gap:8, flexWrap:"wrap"}, ...["weaken","grow","hack"].map(key => h("span", {key, style:{
      padding:"4px 10px", borderRadius:20, background: key === d.phase ? color : "#293747",
      color: key === d.phase ? "#10202a" : palette.muted, fontSize:12}}, key))),
    t ? small(t.name + " · " + cash(t.moneyAvailable) + " of " + cash(t.moneyMax) + " available") : small("No active target"),
    t && bar(t.moneyAvailable, t.moneyMax, color));
}
function roadmap(d, goal) {
  const {player} = d;
  const steps = gates.map(([faction,host]) => ({faction, server:d.hosts.find(s=>s.name===host)})).filter(s=>s.server);
  return card("Next milestones", goal && box({borderLeft:"3px solid "+palette.gold,paddingLeft:12},
    h("strong",null,goal), small("Pinned goal · Read live reputation in Factions or the character overview.")),
    ...steps.map(({faction,server}) => {
      const joined = player.factions.includes(faction);
      const status = joined ? "Joined" : server.backdoorInstalled ? "Check invitations" :
        player.skills.hacking < server.requiredHackingSkill ? "Hack " + player.skills.hacking + " / " + server.requiredHackingSkill :
        server.hasAdminRights ? "Ready for backdoor" : "Root access needed";
      return box({display:"grid",gap:5}, box({display:"flex",justifyContent:"space-between",gap:10},h("strong",null,faction),small(status)),
        !joined && bar(player.skills.hacking,server.requiredHackingSkill,palette.blue));
    }));
}
function overview(d, history, goal) {
  return box({display:"grid",gap:12},grid(operation(d),card("Balance history",digits(cash(d.player.money),palette.mint),balanceChart(history))),
    grid(roadmap(d,goal),card("Background work",
      h("strong",null,d.scanner ? "Contract scanner online" : "Contract scanner offline"),
      small(d.contracts.length + " contract files on the network. Supported puzzles are attempted by contracts.js."),
      h("strong",null,fmt.format(d.shares)+" reputation-sharing threads"),
      small("These threads support faction work while the network earns money."),
      h("strong",null,fmt.format(d.used)+" / "+fmt.format(d.ram)+" GB in use"),bar(d.used,d.ram,palette.blue),
      small(d.rooted+" of "+d.hosts.length+" servers under your control."))));
}
function networkView(d, selected, select) {
  const host = d.hosts.find(s=>s.name===selected) ?? d.home;
  return box({display:"grid",gap:12}, card("Network routes",h("label",null,"Inspect a server  ",
    h("select",{value:host.name,onChange:e=>select(e.target.value),style:{padding:8,background:"#101c28",color:palette.ink}},
      ...d.hosts.map(s=>h("option",{key:s.name,value:s.name},s.name)))),
    box({display:"flex", flexWrap:"wrap", gap:7},...host.path.map((step,i)=>h("span",{key:step,style:{background:"#233a4d",padding:"5px 9px",borderRadius:5}},(i?"→ ":"")+step))),
    small([host.hasAdminRights?"Root access":"Root required",host.backdoorInstalled?"Backdoor installed":"No backdoor","Required hacking level "+host.requiredHackingSkill].join(" · "))),
    grid(card("Server memory",digits(fmt.format(host.ramUsed)+" GB"),bar(host.ramUsed,host.maxRam,palette.blue),small("Of "+fmt.format(host.maxRam)+" GB on "+host.name)),
      card("Server activity",digits(String(host.processes.length)),small("Running processes · "+host.files.length+" contract files"))),
    card("Largest memory users",...d.hosts.filter(s=>s.ramUsed>0).sort((a,b)=>b.ramUsed-a.ramUsed).slice(0,5).map(s=>
      box({display:"grid",gap:4},small(s.name+" · "+fmt.format(s.ramUsed)+" / "+fmt.format(s.maxRam)+" GB"),bar(s.ramUsed,s.maxRam,palette.mint)))));
}
function details(d, history) {
  const recent = history.filter(p=>p.time>=d.time-60000), first=recent[0];
  const span=first ? (d.time-first.time)/1000 : 0;
  const t=d.target, p=d.player;
  const next=programs.find(([file])=>!d.owned.some(([owned])=>owned===file));
  return box({display:"grid",gap:12},grid(card("Income",digits(rate(d.income[1])),small("Average script income since installing augments"),
    small("Active scripts: "+rate(d.income[0])),small("Recent net cash change: "+(span>=5?rate((p.money-first.cash)/span):"Collecting samples")),
    small("Hacknet: "+rate(d.hacknet)+" across "+d.nodes+" nodes")),
    card("Character",digits("Hack "+p.skills.hacking,palette.blue),small(p.city+" · HP "+p.hp.current+" / "+p.hp.max),
      small("STR "+p.skills.strength+" · DEF "+p.skills.defense+" · DEX "+p.skills.dexterity+" · AGI "+p.skills.agility+" · CHA "+p.skills.charisma),
      small(p.factions.join(" · ")||"No faction memberships"))),
    grid(card("Target details",h("strong",null,t?.name??"No target"),small(d.workers.length+" workers · "+sum(d.workers,w=>w.threads)+" threads"),
      t && small("Security "+t.hackDifficulty.toFixed(2)+" · Minimum "+t.minDifficulty.toFixed(2)),
      t && small("Estimated H / G / W times: "+d.times.map(ms=>Math.ceil(ms/1000)+"s").join(" / "))),
    card("Access programs",h("strong",null,d.owned.length+" / 5 port openers"),small(d.owned.map(([f])=>f.replace(".exe","")).join(" · ")),
      small(next?"Next: "+next[0]+" · "+cash(next[1])+(p.money>=next[1]?" · Affordable":""):"All port openers acquired."))),
    card("Open contracts",...(d.contracts.length?d.contracts.map(c=>small(c.host+" / "+c.file)):[small("No contract files found on the latest scan.")])));
}
function Dashboard({feed,goal}) {
  const [tab,setTab]=React.useState("Overview");
  const [selected,select]=React.useState("home");
  const [frame,setFrame]=React.useState(feed.latest);
  React.useEffect(()=>{feed.update=setFrame;setFrame(feed.latest);return ()=>{feed.update=null;};},[feed]);
  const {data,history}=frame;
  return box({boxSizing:"border-box",width:"100%",minWidth:0,whiteSpace:"normal",background:"#0e1823",color:palette.ink,
    font:"15px/1.4 'Segoe UI', sans-serif",padding:"18px 20px 22px",textAlign:"left"},
    box({display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,flexWrap:"wrap"},h("h2",{style:{margin:0,fontSize:28,letterSpacing:"-.035em"}},"Operations desk"),
      small("Kazah  /  "+data.player.city+"  ·  "+new Date(data.time).toLocaleTimeString("en-GB"))),
    box({display:"flex",gap:6,margin:"13px 0 15px"},...["Overview","Network","Details"].map(name=>h("button",{key:name,onClick:()=>setTab(name),"aria-pressed":name===tab,
      style:{cursor:"pointer",border:"1px solid "+palette.line,borderRadius:6,padding:"7px 14px",font:"inherit",fontWeight:600,
        color:tab===name?"#10202a":palette.ink,background:tab===name?palette.mint:palette.panel}},name))),
    tab==="Overview"?overview(data,history,goal):tab==="Network"?networkView(data,selected,select):details(data,history));
}

/** Usage: run monitor.js [refresh-ms] ["goal to display"] */
export async function main(ns) {
  ns.disableLog("ALL");
  if (ns.getHostname()!=="home" || ns.ps("home").filter(p=>p.filename===ns.getScriptName()).length>1) {
    throw new Error("Run one monitor on home. Reopen it from Active Scripts.");
  }
  const requested=Number(ns.args[0]??2000);
  const refresh=Number.isFinite(requested)?Math.max(1000,requested):2000;
  const goal=ns.args.slice(1).join(" ");
  const feed={latest:null,update:null};
  const history=[];
  ns.ui.openTail();
  const [width,height]=ns.ui.windowSize();
  ns.ui.resizeTail(Math.min(1080,width-30),Math.min(780,height-90));
  ns.ui.moveTail(Math.max(10,Math.min(265,width-1110)),35);
  ns.ui.setTailTitle("Kazah  /  Operations desk");
  while (true) {
    const data=snapshot(ns);
    history.push({time:data.time,cash:data.player.money});
    while(history.length>1 && history[0].time<data.time-600000) history.shift();
    const first=!feed.latest;
    feed.latest={data,history:[...history]};
    if(first) ns.printRaw(h(Dashboard,{feed,goal}));
    else feed.update?.(feed.latest);
    await ns.sleep(refresh);
  }
}
