## zReader

    Thanks to Google, It kills Google Reader, an important part of my net life 
    
    It's hard for me to belive it 
    It's hard for me to forget it 
    It's hard for me to keep "do not invent the wheels" 

## Demo

    Now only my own demo, if you deploy it, let me know, thank you.

 * [My Reader](http://zetng.com/reader/view)

## Deploy
    
    LAMP server with mod_rewrite module on
    
 * Get the code and extract to /var/www/reader/ , **don't forget to run `git submodule update --init` after `git clone ..`** 
 * import var/schema.sql to your mysql database like my_reader
 * copy var/config.ini.default to var/config.ini and edit according to your enviroment
 * if you have downloaded the Google Reader data throught script [GReader-Archive](https://github.com/etng/GReader-Archive), just put it under var/data/from_gr 
   and then run `php -f bin/import_google_reader.php` 
   it will last for a long time if the data is huge,sorry.so you have to **use screen or tmux so that it will not break for bad network**
 * run `php -f bin/check_feeds.php` to check for feed update, **run in tmux/screen or use nohup to keep it running forever**
 * run `php -f bin/init_subscriptions.php` to init user subscriptions for old data, **run it in tmux/screen or use nohup to keep it running forever**

## Known Bugs
 
    Too many bugs now, I will fix every bug day after day until I make a real list here

## Contact
 
    Follow my github account, you will find how to contact me.
    


