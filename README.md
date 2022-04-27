# Coronavirus Annotation Tool 3.0
Tool for crowdsourcing information on the coronavirus life cycle from an expert community.


## Scripts/Setup

**Backend**

2. Install dependencies `pipenv install`
3. Run dev server  `pipenv run serve`
4. Deploy `pipenv run deploy`

**Frontend**
1. Install packages `npm i`
2. Start bundler `npm run watch`

## Deployment on SCI server
1. `cd coronavirus-annotation-3`
2. `sudo systemctl restart app3`
3. `npm install`
4. `npm run build`
5. `sudo systemctl restart nginx`

## Helper Commands
- `npm run lint-js` - Lints your javascript files via eslint
- `npm run lint-fix` - Lints your javascript files via eslint and fixes errors
- `npm run watch` - Start webpack and watch files
- `npm run build` - Build your assets files once
- `flake8 app` - Lint your python files via flake8
