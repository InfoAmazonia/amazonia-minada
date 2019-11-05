# Amazônia Minada
This project collect everyday data coming from ICMBio and National Agency of Mining institutions searching for irregular licenses granted into Amazon Forest protected areas. Once they're found, a tweet is sent from @amazonia_minada warning the crime. Also, all the activities can be visualised on [this map](https://infoamazonia.org/pt/embed/?map_only=1&map_id=20394&width=960&height=480).


## Why?
Every month, about 20 irregular licenses are granted without any explanation and without no one knows. Alerting those acts on Twitter and make it visual on a map is an attempt to let people know about the neglect of involved institutions to have a chance to complain and protest about it.

## How?
Everyday, the *license's application* make a request to ANM's *(Agência Nacional de Mineração)* site looking for the **shapefile** which contains all the licenses granted by the institution. After the files are downloaded, our app start to **read and import** into database every data collected about those licenses *(geolocations and properties)*. Once all licenses are persisted into the database, the application start to **query for irregular licenses** granted into protected areas *(imported as seed manually)* and register them in a specific collection. The brand news are **scheduled to be tweeted**. If there's no licenses found, the app also has alternative tweets schedule for all days in a week. Finally, the app provides four endpoints for downloading **unities** geoJSON and CSV files and **invasions** *(illegal licenses)* geoJSON and CSV files.

## Run
This is a simple applications using *NodeJs* and *MongoDB*. To make run everything, we're using here *Docker* with *Docker Compose*. Then:

    $ docker-compose up --build -d

### Seeds
To get all protected areas *(unities)*, you should run the project seeds:

    $ docker-compose exec licenses npm run seeds

### Generate Files
It's possible to *(re)*generate files without having to process everything. Once the database is updated, you only need to run:

    $ docker-compose exec licenses npm run make-files


## License

```
MIT License

Copyright (c) 2017 Rodrigo Brabo

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files 
(the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software,
and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

```
