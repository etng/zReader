<?php
require dirname(__file__).'/lib/common.php';
$_COOKIE['member_id']  = 1;
Reader_Api::start();
class Reader_Api
{
    protected $url_segments = array();
    public static function start(){
        $api =new self();
        $api->handle();
    }
    function handle(){
        $this->member = Reader_Member::find($_COOKIE['member_id']);
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
        return $_POST;
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
        $activity->state_unread = 1;
        foreach($actions as $action=>$state){
            $field = 'state_'.$state;
            if($action=='a'){
                $activity->$field = 1;
                if($state=='read' || $state=='markasread')
                {
                    $activity->state_unread = 0;
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
        return $activity->asCategories();
    }
    function subscription(){
        $subscriptions = array();
        foreach(Reader_Subscription::filter(array('member_id'=>$this->member->id)) as $subscription){
            $categories=array();
            if($subscription->category_id){
                $categories[]='label/'.Reader_Category::find(array('member_id'=>$this->member->id, 'id'=>$subscription->category_id))->name;
            }
            $feed = Reader_Feed::find($subscription->feed_id);
            $id = 'feed/' . $feed->feed_url;
            $subscriptions[]=array_merge($feed->pluck('id', 'feed_url', 'name'), $subscription->pluck('read', 'starred', 'markasread', 'unread'), compact('categories', 'id'));
        }
        return $subscriptions;
    }
    function stream($filter='state/unread', $timestamp='', $continuation='', $limit=200){
        $params[$this->url_segments[1]] = $this->url_segments[2];
        return array_merge($params, $_GET, $_POST);
        $response = array(
            'continuation'=> '',
            'articles'=>array(),
        );
        $reading_list = Reader_Activity::getStream($stream, $filter, $timestamp, $continuation, $limit);
        $response['continuation'] = $reading_list->continuation;
        foreach($reading_list->activities as $activity){
            $article  = Reader_Article::find($activity->article_id);
            $categories = $activities->asCategories();
            if($article->category_id){
                $categories[]= 'label/'.Reader_Category::find(array('member_id'=>$this->member->id, 'category_id'=>$article->category_id))->name;
            }

            $response['articles'][]=array_merge($article->toArray(), $extra);
        }
        return $response;
    }
}
