<?php
Et_Model::register('Reader_Feed', 'Reader_');
class Reader_Feed extends Reader_Feed_Base{
    function check($content=''){
        $sync_status = true;
        $sync_message = 'ok';
        $count = 0;
        try
        {
            if($content){
                $reader = Zend_Feed_Reader::importString($content);
            }
            else{
                if(empty($this->feed_url)){
                    throw new Exception("can not update empty feed url");
                }
                $reader = Zend_Feed_Reader::import($this->feed_url);
            }
            $article_ids = array();
            foreach($reader as $entry)
            {
                if($entry->getTitle()){
                    $authors = array();
                    if($entry->getAuthors()){
                        foreach($entry->getAuthors() as $oAuthor){
                            foreach(array('name', 'email') as $key){
                                if(!empty($oAuthor[$key])){
                                    $authors[]=$oAuthor[$key];
                                    break;
                                }
                            }
                        }
                    }
                    $article = Reader_Article::create(array(
                        'feed_id'       => $this->id,
                        'title'         => $entry->getTitle(),
                        'author'        => $authors?implode("\t", $authors):'',
                        'origin_url'    => $entry->getLink(),
                        'published_at'  => date('Y-m-d H:i:s', strtotime($entry->getDateModified())),
                        'content'       => $entry->getContent(),
                    ));
                    $article_ids []=$article->id;
                }
            }
            foreach(Reader_Subscription::filter(array('feed_id'=>$this->id)) as $subscription){
                foreach($article_ids as $article_id)
                {
                    Reader_Activity::findOrCreate(array(
                        'article_id'    => $article_id,
                        'feed_id'       => $this->id,
                        'member_id'     => $subscription->member_id,
                    ), array(
                        'state_unread'=>1
                    ));
                }
                $count = count($article_ids);
                $subscription->increment('unread', $count)->save();
            }
        }
        catch(Exception $e)
        {
            $sync_status = false;
            $sync_message = $e->getMessage();
        }
        $synced_at = date('Y-m-d H:i:s');
        $this->setFromArray(compact('synced_at', 'sync_status', 'sync_message'))->save();
        if(!$sync_status){
            throw new Exception($sync_message);
        }
        return $count;
    }
}
