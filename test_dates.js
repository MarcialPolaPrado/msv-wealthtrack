
const fiscalDay = 25;

function getAhorroWeekRange(refDateStr) {
    if (!refDateStr) return { start: new Date(), end: new Date() };
    const ref = refDateStr.length === 7 ? new Date(refDateStr + "-01") : new Date(refDateStr);
    
    if (isNaN(ref.getTime())) {
        return { start: new Date(), end: new Date() };
    }

    const rY = ref.getFullYear();
    const rM = ref.getMonth();

    let fsY, fsM;
    if (ref.getDate() >= fiscalDay) {
        fsY = rY;
        fsM = rM;
    } else {
        const prevMonth = new Date(rY, rM - 1, 1);
        fsY = prevMonth.getFullYear();
        fsM = prevMonth.getMonth();
    }

    const fsT = new Date(fsY, fsM, fiscalDay).getTime();
    const daysDiff = Math.floor((ref.getTime() - fsT) / (24 * 60 * 60 * 1000));
    const weeksSince = Math.floor(daysDiff / 7);
    const s = new Date(fsT + (weeksSince * 7 * 24 * 60 * 60 * 1000));
    const e = new Date(s.getTime() + (6 * 24 * 60 * 60 * 1000));
    
    return { start: s, end: e };
}

try {
    const res1 = getAhorroWeekRange("2024-03-26");
    console.log("2024-03-26 ->", res1.start.toDateString(), "-", res1.end.toDateString());
    
    const res2 = getAhorroWeekRange("2024-03");
    console.log("2024-03 ->", res2.start.toDateString(), "-", res2.end.toDateString());

    const res3 = getAhorroWeekRange("invalid");
    console.log("invalid ->", res3.start.toDateString());

} catch (err) {
    console.error("CRASHED:", err);
}
