<?php
require dirname(__file__).'/lib/common.php';
Reader_Api::start();
class Reader_Api
{
    protected $url_segments = array();
    public static function start(){
        $api =new self();
        $api->handle();
    }
    function handle(){
        $this->member = current_member();
        $status = true;
        $message = 'ok';
        $payload = array();
        $pathinfo = $_SERVER['PATH_INFO'];
        $segments = explode('/', $pathinfo);
        array_shift($segments);
        $method = lcfirst(str_replace(' ', '', ucwords(str_replace('-', ' ', array_shift($segments)))));
        $this->url_segments = $segments;
        try{
            $payload = $this->$method();
        }catch(Exception $e){
            $status = false;
            $message = $e->getMessage();
        }
        @header('Content-Type: application/json');
        echo json_encode(compact('status', 'message', 'payload'));
        exit();
    }
    function markAllAsRead(){
        $params = array_merge($_GET, $_POST);
        $stream = $params['s'];
        $timestamp = $params['ck']/1000;
        return Reader_Activity::markStreamAsRead($this->member->id, $stream, $timestamp);
    }
    function editTag()
    {
        $id = $_POST['i'];
        $actions = array();
        foreach($_POST as $k=>$v){
            if($k!='i'){
                $parts = explode('/', $v, 2);
                $actions[$k]=$parts[1];
            }
        }
        $activity = Reader_Activity::findOrCreate(array('member_id'=>$this->member->id, 'article_id'=>$id));
        foreach($actions as $action=>$state){
            $field = 'state_'.$state;
            if($action=='a'){
                if($state=='read')
                {
                    if(!$activity->state_markasread)
                    {
                        $activity->$field = 1;
                        $activity->state_unread = 0;
                    }
                }
                else if($state=='markasread'){
                    if(!$activity->state_read)
                    {
                        $activity->$field = 1;
                        $activity->state_unread = 0;
                    }
                }
                else{
                    $activity->$field = 1;
                }
            }
            elseif($action=='r'){
                $activity->$field = 0;
                if($state=='read' || $state=='markasread')
                {
                    $activity->state_unread = 1;
                }
            }
        }
        $activity->save();
        //        var_dump($activity->asCategories());
        //        die();
        return $activity->asCategories();
    }
    function subscription(){
        return $this->member->getSubscriptions();
    }
    function stream(){
        $params = array_merge($_GET, $_POST);
        $timestamp = $params['ck'];
        $limit = $params['n'];
        $continuation = @$params['c'];
        $filter = @$params['filter'];
        $stream = @$params['stream'];
        $response = array(
            'continuation'=> '',
            'params'=> $params,
            'articles'=>array(),
        );
        $reading_list = Reader_Activity::getStream($this->member->id, $stream, $filter, $timestamp, $continuation, $limit);
        $response['continuation'] = $reading_list->continuation;
        $response['debug']=$reading_list->debug;
        foreach($reading_list->activities as $activity){
            $oArticle  = Reader_Article::find($activity->article_id);
            $oFeed  = Reader_Feed::find($oArticle->feed_id);
            $categories = $activity->asCategories();
            $origin = $oFeed->pluck(array(
                'name'=>'title',
                'feed_url'=>'streamId',
            ));
            $origin['streamId'] = 'feed/'.$origin['streamId'];
            $alternate = array(
                'type'=>'text/html',
                'href'=>$oArticle->origin_url,
            );
            $article = array_merge($oArticle->pluck(array(
                'id',
                'content',
                'title',
                'author',
                'published_at'=>'updated',
            )), compact('categories', 'origin', 'alternate'));

            $article['updated']=strtotime($article['updated']);
            $response['articles'][]=$article;
        }
        return $response;
    }
}
