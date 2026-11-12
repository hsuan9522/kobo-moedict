#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [ "$#" -gt 1 ]; then
    echo "用法：bash run.sh [all|traditional-bpmf|combined-bpmf|combined-pinyin]" >&2
    exit 1
fi
VERSION="${1:-all}"
case "$VERSION" in
    cn) VERSION="combined-pinyin" ;;
    tw) VERSION="combined-bpmf" ;;
    all|traditional-bpmf|combined-bpmf|combined-pinyin) ;;
    *) echo "不支援的版本：$VERSION" >&2; exit 1 ;;
esac
exec python scripts/build.py "$VERSION"
