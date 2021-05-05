# Coronavirus Annotation Tool 2.0
Tool for crowdsourcing information on the coronavirus life cycle from an expert community.


## Scripts/Setup

**Backend**
1. Create a virtual env `python3 -m venv venv`
2. Install dependencies `pipenv install`
3. Run dev server  `pipenv run serve`
4. Deploy `pipenv run deploy`

**Frontend**
1. Install packages `npm i`
2. Start bundler `npm run watch`

## Deployment on SCI server
1. `cd coronavirus-annotation-2`
2. `sudo systemctl restart app`
3. `npm install`
4. `npm run build`
5. `sudo systemctl restart nginx`

## Helper Commands
- `npm run lint-js` - Lints your javascript files via eslint
- `npm run lint-fix` - Lints your javascript files via eslint and fixes errors
- `npm run watch` - Start webpack and watch files
- `npm run build` - Build your assets files once
- `flake8 app` - Lint your python files via flake8
