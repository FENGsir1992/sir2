import React from "react";

export default function FontCheckBadge() {
  const [status, setStatus] = React.useState<"checking" | "ok" | "fail">("checking");
  const [net, setNet] = React.useState<"unknown" | "ok" | "notfound" | "badtype">("unknown");

  const runCheck = React.useCallback(async () => {
    const anyDoc = document as any;
    try {
      setStatus("checking");
      setNet("unknown");
      try {
        const r = await fetch("/fonts/zihun144hao-langyuanti.woff2", { cache: "no-store" });
        if (!r.ok) {
          setNet("notfound");
        } else {
          const ct = r.headers.get("content-type") || "";
          if (ct.includes("font/woff2") || ct.includes("application/font-woff2") || ct.includes("application/font-woff")) {
            setNet("ok");
          } else if (ct.includes("application/octet-stream") || ct.includes("application/x-font-ttf") || ct.includes("font/ttf") || ct.includes("application/x-font-truetype")) {
            // 服务器把 ttf 当成 woff2 提供，类型不匹配
            setNet("badtype");
          } else {
            setNet("unknown");
          }
        }
      } catch {
        setNet("notfound");
      }
      const immediate = anyDoc?.fonts?.check?.('16px "zihun144hao-langyuanti"') ?? false;
      if (immediate) {
        setStatus("ok");
        return;
      }
      await anyDoc?.fonts?.ready;
      const ready = anyDoc?.fonts?.check?.('16px "zihun144hao-langyuanti"') ?? false;
      if (ready) {
        setStatus("ok");
        return;
      }
      setTimeout(() => {
        const later = anyDoc?.fonts?.check?.('16px "zihun144hao-langyuanti"') ?? false;
        setStatus(later ? "ok" : "fail");
      }, 800);
    } catch {
      setStatus("fail");
    }
  }, []);

  React.useEffect(() => {
    runCheck();
  }, [runCheck]);

  const bg = status === "ok" ? "bg-green-500" : status === "fail" ? "bg-red-500" : "bg-gray-400";
  const label = status === "ok" ? "字体已生效" : status === "fail" ? "字体未加载" : "检测中";
  const netText = net === "ok" ? "文件可访问(woff2)" : net === "notfound" ? "文件缺失" : net === "badtype" ? "文件类型异常，疑似TTF" : "文件待检测";

  return (
    <div className="fixed bottom-3 right-3 z-50 select-none">
      <div className={`text-white text-xs px-2 py-1 rounded shadow flex items-center gap-2 ${bg}`}>
        <span>zihun144hao-langyuanti：{label}</span>
        <button
          onClick={runCheck}
          className="bg-white/20 hover:bg-white/30 transition-colors rounded px-1 py-[2px]"
          title="重新检测"
        >
          重测
        </button>
        <span className="opacity-80">| {netText}</span>
      </div>
    </div>
  );
}


