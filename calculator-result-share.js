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
    background.addColorStop(0, "#ff9a9e");
    background.addColorStop(0.5, "#fad0c4");
    background.addColorStop(1, "#fbc2eb");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,.9)";
    roundedRect(ctx, 70, 70, 1060, 1360, 42);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = "#d63d5b";
    ctx.font = "800 34px Arial, sans-serif";
    ctx.fillText("COUPLE IN BOND", 600, 145);

    ctx.fillStyle = "#1f2937";
    ctx.font = "800 58px Arial, sans-serif";
    const names = `${result.nameA} + ${result.nameB}`;
    wrapText(ctx, names, 600, 250, 900, 70, 2);

    ctx.fillStyle = "#6a00f4";
    ctx.font = "900 190px Arial, sans-serif";
    ctx.fillText(`${result.score}%`, 600, 535);

    ctx.fillStyle = "#d63d5b";
    ctx.font = "800 38px Arial, sans-serif";
    ctx.fillText(result.badge, 600, 610);

    const meterRows = [
      ["Vibe alignment", result.meters.vibe],
      ["Snack synergy", result.meters.snack],
      ["Texting tempo", result.meters.text],
      ["Meme compatibility", result.meters.meme]
    ];
    ctx.textAlign = "left";
    meterRows.forEach(([label, value], index) => {
      const y = 730 + index * 82;
      ctx.fillStyle = "#6b7280";
      ctx.font = "700 26px Arial, sans-serif";
      ctx.fillText(label, 150, y);
      ctx.fillStyle = "#eadffb";
      roundedRect(ctx, 150, y + 18, 780, 20, 10);
      ctx.fill();
      ctx.fillStyle = "#8b3dff";
      roundedRect(ctx, 150, y + 18, 780 * (value / 100), 20, 10);
      ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.font = "800 25px Arial, sans-serif";
      ctx.fillText(`${value}%`, 960, y + 37);
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#6b7280";
    ctx.font = "600 24px Arial, sans-serif";
    ctx.fillText("A playful result for a memorable moment", 600, 1240);
    ctx.fillStyle = "#d63d5b";
    ctx.font = "800 26px Arial, sans-serif";
    ctx.fillText("couplein.bond/calculator.html", 600, 1325);
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
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="820" viewBox="0 0 720 820"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff9a9e"/><stop offset=".5" stop-color="#fad0c4"/><stop offset="1" stop-color="#fbc2eb"/></linearGradient></defs><rect width="720" height="820" fill="url(#bg)"/><rect x="35" y="35" width="650" height="750" rx="28" fill="#fff" fill-opacity=".92"/><text x="360" y="92" text-anchor="middle" font-size="25" font-weight="800" font-family="Arial" fill="#d63d5b">COUPLE IN BOND</text><text x="360" y="170" text-anchor="middle" font-size="34" font-weight="800" font-family="Arial" fill="#1f2937">${nameA} + ${nameB}</text><text x="360" y="350" text-anchor="middle" font-size="150" font-weight="900" font-family="Arial" fill="#6a00f4">${result.score}%</text><text x="360" y="405" text-anchor="middle" font-size="28" font-weight="800" font-family="Arial" fill="#d63d5b">${badge}</text>${bars}<text x="360" y="755" text-anchor="middle" font-size="19" font-family="Arial" fill="#6b7280">A playful result for a memorable moment</text></svg>`;
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
