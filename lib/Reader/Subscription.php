<?php
Et_Model::register('Reader_Subscription', 'Reader_');
class Reader_Subscription extends Reader_Subscription_Base{
    public static function loadOpml($member, $opml_file){
        $opml = Et_OPML::parseFile($opml_file);
        $i=0;
        foreach($opml->feeds as $feed)
        {
            $oCategory =null;
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
            $oFeed = Reader_Feed::findOrCreate(array('feed_url'=>$feed->feed_url), array('name'=>$feed->name));
            $subscription = self::findOrCreate(array(
                'member_id'=>$member->id,
                'feed_id' => $oFeed->id,
                'category_id'=>$oCategory?$oCategory->id:0
            ));
            // it will slow the script down, make a background script to do it
//            $subscription->initActivities();
            $i++;
        }
        return $i;
    }
    function getArticleIds(){
        $db = Reader_Article::table()->getAdapter();
        $sql = "SELECT
                    id
                FROM
                    article
                WHERE
                    feed_id={$this->id}
                    AND updated_at<='{$this->created_at}'
                ";
        return $db->fetchCol($sql);
    }
    function initActivities(){
        $i=0;
        foreach($this->getArticleIds() as $article_id){

            $activity_id = Reader_Activity::findOrCreate(array(
                'feed_id'=>$this->feed_id,
                'member_id'=>$this->member_id,
                'article_id'=>$article_id,
            ), array(
                'state_starred'=>0,
                'state_read'=>0,
                'state_unread'=>1,
                'state_markasread'=>0,
            ));
            $i++;
        }
        $this->inited_at = date('Y-m-d H:i:s');
        $this->save();
        $this->recount();
        return $i;
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