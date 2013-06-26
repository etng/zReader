<?php
Et_Model::register('Reader_Subscription', 'Reader_');
class Reader_Subscription extends Reader_Subscription_Base{
    public static function loadOpml($member, $opml_file){
        $opml = Et_OPML::parseFile($opml_file);
        foreach($opml->feeds as $feed)
        {
            $feed->path = explode('||', $feed->path);
            array_shift($feed->path);
            if($feed->path)
            {
                $category = array_shift($feed->path);
                $oCategory = Reader_Category::findOrCreate(array(
                    'member_id'=>$member->id,
                    'name' => $category,
                ));
            }
            $oFeed = Reader_Feed::findOrCreate(array('feed_url'=>$feed->url), array('name'=>$feed->name));
            self::findOrCreate(array(
                'member_id'=>$member->id,
                'feed_id' => $oFeed->id,
                'category_id'=>$oCategory?$oCategory->id:0
            ));
        }
    }
    function recount(){
        $filters = array(
            'feed_id'=>$this->feed_id,
            'member_id'=>$this->member_id,
        );
        $stat = array();
        foreach(array('read', 'markasread', 'unread', 'starred') as $state)
        {
            $stat[$state]= Reader_Activity::count(array_merge(array('state_'.$state=>1), $filters));
        }
        $this->refresh();
        $this->setFromArray($stat)->save();
    }
}