#!/bin/bash
if [ $1 == "cn" ]; then
    TYPE="pinyin"
    NATION="CN"
else
    TYPE="bpmf"
    NATION="TW"
fi

OUTPUT_FILE="./output/dict.kobo.zip"
RENAMED_FILE="./output/dicthtml-$NATION.zip"
if [ -f "$RENAMED_FILE" ]; then
    rm "$RENAMED_FILE"
fi

node ./parse.js "$TYPE"

pyglossary ./output/dictionary.csv "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
    mv "$OUTPUT_FILE" "$RENAMED_FILE"
    echo "✅ 檔案已重新命名為 $RENAMED_FILE"
else
    echo "⚠️  找不到 $OUTPUT_FILE，無法重新命名"
fi
