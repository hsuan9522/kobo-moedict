const path = require("node:path");

// 所有路徑以專案位置為準，不依賴執行指令時所在的目錄。
const projectRoot = path.resolve(__dirname, "..");

const sources = {
    primary: path.join(projectRoot, "data", "dict-revised.json"),
    auxiliary: path.join(projectRoot, "data", "dict-csld.json"),
};

const versions = [
    {
        id: "traditional-bpmf",
        label: "純繁體－注音",
        mode: "traditional",
        pronunciation: "bopomofo",
        filename: "dicthtml-TW.zip",
        directory: "tranditional",
    },
    {
        id: "combined-bpmf",
        label: "繁體＋簡體－注音",
        mode: "combined",
        pronunciation: "bopomofo",
        filename: "dicthtml-TW.zip",
        directory: "",
    },
    {
        id: "combined-pinyin",
        label: "繁體＋簡體－拼音",
        mode: "combined",
        pronunciation: "pinyin",
        filename: "dicthtml-CN.zip",
        directory: "",
    },
].map((version) => ({
    ...version,
    // 每個版本有獨立工作目錄，避免同名 CSV 或 ZIP 互相覆蓋。
    workDir: path.join(projectRoot, "output", version.id),
    destination: path.join(
        projectRoot,
        "dictionary",
        version.directory,
        version.filename,
    ),
}));

module.exports = { projectRoot, sources, versions };
