(function () {
  "use strict";

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
    const words = String(text || "").split(/\s+/);
    const lines = [];
    let line = "";
    words.forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    lines.slice(0, maxLines).forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
    return Math.min(lines.length, maxLines);
  }

  function createLoveResultImage(result) {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext("2d");
    const background = ctx.createLinearGradient(0, 0, 1200, 1500);
    background.addColorStop(0, "#24133f");
    background.addColorStop(0.52, "#5d2f88");
    background.addColorStop(1, "#e45e83");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    [[120, 160, 210, "rgba(255,255,255,.08)"], [1080, 280, 300, "rgba(255,211,106,.12)"], [1000, 1340, 240, "rgba(255,255,255,.07)"]].forEach(([x, y, radius, color]) => {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.save();
    ctx.shadowColor = "rgba(12,5,25,.32)";
    ctx.shadowBlur = 46;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = "#fffaf6";
    roundedRect(ctx, 70, 70, 1060, 1360, 48);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#ff5574";
    roundedRect(ctx, 410, 125, 380, 52, 26);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 24px Arial, sans-serif";
    ctx.fillText("LOVE CALCULATOR • RESULT", 600, 159);

    ctx.fillStyle = "#24162d";
    ctx.font = "800 62px Arial, sans-serif";
    const names = `${result.nameA} + ${result.nameB}`;
    wrapText(ctx, names, 600, 280, 900, 74, 2);
    ctx.fillStyle = "#80658e";
    ctx.font = "600 25px Arial, sans-serif";
    ctx.fillText("A little science, a lot of fun", 600, 390);

    ctx.beginPath();
    ctx.strokeStyle = "#ffd36a";
    ctx.lineWidth = 18;
    ctx.arc(600, 610, 170, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (result.score / 101));
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "#f1e8f2";
    ctx.lineWidth = 18;
    ctx.arc(600, 610, 170, -Math.PI / 2 + Math.PI * 2 * (result.score / 101), Math.PI * 1.5);
    ctx.stroke();
    ctx.fillStyle = "#6a00f4";
    ctx.font = "900 126px Arial, sans-serif";
    ctx.fillText(`${result.score}%`, 600, 646);
    ctx.fillStyle = "#ff5574";
    ctx.font = "800 34px Arial, sans-serif";
    ctx.fillText(result.badge, 600, 860);

    const meterRows = [["Vibe alignment", result.meters.vibe], ["Snack synergy", result.meters.snack], ["Texting tempo", result.meters.text], ["Meme compatibility", result.meters.meme]];
    ctx.textAlign = "left";
    meterRows.forEach(([label, value], index) => {
      const y = 960 + index * 78;
      ctx.fillStyle = "#80658e";
      ctx.font = "700 24px Arial, sans-serif";
      ctx.fillText(label, 150, y);
      ctx.fillStyle = "#efe6f3";
      roundedRect(ctx, 150, y + 17, 780, 18, 9);
      ctx.fill();
      const bar = ctx.createLinearGradient(150, 0, 930, 0);
      bar.addColorStop(0, "#ff5574");
      bar.addColorStop(1, "#8056e8");
      ctx.fillStyle = bar;
      roundedRect(ctx, 150, y + 17, 780 * (value / 100), 18, 9);
      ctx.fill();
      ctx.fillStyle = "#24162d";
      ctx.font = "800 24px Arial, sans-serif";
      ctx.fillText(`${value}%`, 970, y + 35);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#80658e";
    ctx.font = "600 23px Arial, sans-serif";
    ctx.fillText("A playful result for a memorable moment", 600, 1335);
    ctx.fillStyle = "#ff5574";
    ctx.font = "800 24px Arial, sans-serif";
    ctx.fillText("couplein.bond", 600, 1385);
    return canvas.toDataURL("image/png");
  }

  function escapeXml(value) {
    return String(value || "").replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" }[character]));
  }

  function createLoveResultTokenImage(result) {
    const nameA = escapeXml(result.nameA);
    const nameB = escapeXml(result.nameB);
    const badge = escapeXml(result.badge);
    const rows = [
      ["Vibe alignment", result.meters.vibe],
      ["Snack synergy", result.meters.snack],
      ["Texting tempo", result.meters.text],
      ["Meme compatibility", result.meters.meme]
    ];
    const bars = rows.map(([label, value], index) => {
      const y = 510 + index * 58;
      return `<text x="90" y="${y}" font-size="22" font-family="Arial" fill="#6b7280">${escapeXml(label)}</text><rect x="90" y="${y + 12}" width="520" height="14" rx="7" fill="#eadffb"/><rect x="90" y="${y + 12}" width="${520 * (value / 100)}" height="14" rx="7" fill="#8b3dff"/><text x="650" y="${y + 30}" font-size="21" font-weight="700" font-family="Arial" fill="#1f2937">${value}%</text>`;
    }).join("");
    const circumference = 2 * Math.PI * 106;
    const dash = circumference * (result.score / 101);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="820" viewBox="0 0 720 820"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#24133f"/><stop offset=".52" stop-color="#5d2f88"/><stop offset="1" stop-color="#e45e83"/></linearGradient><linearGradient id="bar" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ff5574"/><stop offset="1" stop-color="#8056e8"/></linearGradient></defs><rect width="720" height="820" fill="url(#bg)"/><circle cx="90" cy="150" r="125" fill="#fff" fill-opacity=".08"/><circle cx="650" cy="220" r="165" fill="#ffd36a" fill-opacity=".12"/><rect x="35" y="35" width="650" height="750" rx="30" fill="#fffaf6" fill-opacity=".96"/><rect x="205" y="68" width="310" height="38" rx="19" fill="#ff5574"/><text x="360" y="94" text-anchor="middle" font-size="17" font-weight="800" font-family="Arial" fill="#fff">LOVE RESULT</text><text x="360" y="155" text-anchor="middle" font-size="30" font-weight="800" font-family="Arial" fill="#24162d">${nameA} + ${nameB}</text><text x="360" y="190" text-anchor="middle" font-size="17" font-family="Arial" fill="#80658e">A little science, a lot of fun</text><circle cx="360" cy="320" r="106" fill="none" stroke="#f1e8f2" stroke-width="13"/><circle cx="360" cy="320" r="106" fill="none" stroke="#ffd36a" stroke-width="13" stroke-linecap="round" stroke-dasharray="${dash} ${circumference}" transform="rotate(-90 360 320)"/><text x="360" y="350" text-anchor="middle" font-size="92" font-weight="900" font-family="Arial" fill="#6a00f4">${result.score}%</text><text x="360" y="430" text-anchor="middle" font-size="25" font-weight="800" font-family="Arial" fill="#ff5574">${badge}</text>${bars}<text x="360" y="755" text-anchor="middle" font-size="17" font-family="Arial" fill="#80658e">A playful result for a memorable moment</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  async function shareLoveResultImage(dataUrl, title) {
    if (!dataUrl) return "No result image is available yet.";
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], "couple-in-bond-love-result.png", { type: "image/png" });

    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ files: [file], title: title || "Our Love Calculator Result", text: "Our playful Couple in Bond love result" });
      return "Result image shared.";
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return "Result image downloaded. You can share it from your device.";
  }

  window.createLoveResultImage = createLoveResultImage;
  window.createLoveResultTokenImage = createLoveResultTokenImage;
  window.shareLoveResultImage = shareLoveResultImage;
}());
