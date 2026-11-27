#!/bin/zsh
cd "${0:A:h}"
if ! command -v node >/dev/null 2>&1; then
  print "Bản xem trên máy cần Node.js. Bản GitHub Pages không cần cài trên máy."
  read "?Nhấn Enter để đóng."
  exit 1
fi
node scripts/serve.cjs
