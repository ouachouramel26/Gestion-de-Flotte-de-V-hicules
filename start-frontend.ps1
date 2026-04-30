cd frontend-v2\mf-carte
npm install
npm run build
Start-Process npm -ArgumentList "run", "preview" -NoNewWindow

cd ..\mf-shell
npm install
Start-Process npm -ArgumentList "run", "dev" -NoNewWindow
