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

# Things needed to update the tool

## Important Files
### The annotations
These are found in app >> static >> assets >> annotations
These are `csv` files for the annotations you have for each segment. There is one file for each segment.
Annotation files are created in google sheets and then saved as a `csv` file.

The coloumns look like this:
`key,video_time,associated_structures,has_unkown,annotation_type,text_description,ref,url,additional_notes
2,00:00-00:16,"spike protein, e protein, m protein",FALSE,citation,"Numbers of viral proteins: 100 S proteins, 20 E pentamers (100 proteins), 1000 M dimers (2000 proteins), 1000 N proteins","Yinon M Bar-On, Avi Flamholz, Rob Phillips, Ron Milo. Science Forum: SARS-CoV-2 (COVID-19) by the numbers. eLife 2020;9:e57309 DOI: 10.7554/eLife.57309",https://elifesciences.org/articles/57309`

### The Structure Sheet
These are found in app >> static >> assets >> structures
These have all of the color codes, times, and names for each structure.
These are `csv` files for the annotations you have for each segment. There is one file for each segment.
Structure files are created in google sheets and then saved as a `csv` file.
The naming convention for these is `stuctured_structures_seg[whatever vis segment this is for].csv`

The columns look like this:
`Hierarchy,rgb,structure_name,color,hex,time,alias,short_name
cell,"[[255,172,0]]",TMPRSS2,orange,FF8000,"[19,85]",TMPRSS2,TMPRSS2`

### The Stills
These are found in app >> static >> assets >> stills
These are the still images from the video that are flat colors. They map the color to the structure.
The file naming convention is `flat[*****].png` There are five digets in the name, even if it looks like this `flat00000.csv`
The right frame is pulled in the code by getting the time in seconds and multiplying that by the fram rate. Example: 2 seconds into the video would grab `flat00063.csv` 

### The Video
This goes in app >> static >> assets


