<?php
class Et_OPML
{
    public $head=null;
    public $feeds=array();
    public function __construct($feeds=array(), $head=array())
    {
        $this->head = new stdClass();
        $this->setHead($head);
        $this->setFeeds($feeds);
    }
    public static function parseFile($filename)
    {
        return self::parse(file_get_contents($filename));
    }
    public static function parse($xml_string)
    {
        $xml = simplexml_load_string($xml_string);
        $instance = new self();

        $head = array();
        foreach($xml->xpath('/opml/head/*') as $head_item)
        {
            $head[$head_item->getName()] = (string)$head_item;
        }
        $feeds = self::recursiveOutline($xml->body);
        return new self($feeds, $head);
    }
    public static function save(){
        return 'the xml';
    }
    function setFeeds($feeds)
    {
        $this->feeds = $feeds;
    }
    function setHead($k, $v=null)
    {
        if(is_array($k))
        {
            foreach($k as $kk=>$kv)
            {
                $this->setHead($kk, $kv);
            }
        }
        else
        {
            $this->head->$k = $v;
        }
    }
    protected static function recursiveOutline($xml, $path='')
    {
        $items = array();
        foreach($xml->xpath('outline') as $child)
        {
            $name = (string)$child['title'];
            if(count($child->children()))
            {
                foreach(self::recursiveOutline($child, $path.'||'.$name) as $item)
                {
                    $items[]=$item;
                }
            }
            else
            {
                $feed_url = (string)$child['xmlUrl'];
                $site_url = (string)$child['htmlUrl'];
                if($feed_url)
                {
                $items[]= (object)compact(
                    'path',
                    'name',
                    'feed_url',
                    'site_url'
                );
                }
            }
        }
        return $items;
    }
}