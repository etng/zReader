<?php
class Et_Model extends Zend_Db_Table_Row_Abstract{
    protected $events = array();
    public function __construct(array $config = array())
    {
        if(!isset($config['table'])){
            $klass = get_class($this);
            $config['table'] = $klass::table();
        }
        parent::__construct($config);
    }
    public function __set($columnName, $value)
    {
        if(method_exists($this, $method = 'set'.ucfirst($columnName))){
            $this->$method($value);
            return;
        }
        $columnName = $this->_transformColumn($columnName);
        if (!array_key_exists($columnName, $this->_data)) {
            require_once 'Zend/Db/Table/Row/Exception.php';
            throw new Zend_Db_Table_Row_Exception("Specified column \"$columnName\" is not in the row");
        }

        $this->_data[$columnName] = $value;
        $this->_modifiedFields[$columnName] = true;
    }
    public function setFromArray(array $data)
    {
        foreach ($data as $columnName => $value) {
            $this->__set($columnName, $value);
        }

        return $this;
    }
    public function increment($field, $delta){
        $this->refresh();
        $new_value = $this->$field + $delta;
        $this->$field = $new_value;
        return $this;
    }
    protected function defaults_insert(){
        $defaults= array();
        $fields = array('created_at', 'published_at', 'updated_at');
        foreach($fields as $field)
        {
            if(array_key_exists($field, $this->_data)){
                $defaults[$field] = date('Y-m-d H:i:s');
            }
        }
        return $defaults;
    }
    protected function defaults_update(){
        $defaults= array();
        $fields = array('updated_at');
        foreach($fields as $field)
        {
            if(array_key_exists($field, $this->_data)){
                $defaults[$field] = date('Y-m-d H:i:s');
            }
        }
        return $defaults;
    }
    function defaults(){
        if (empty($this->_cleanData)) {
            //insert
            $defaults = $this->defaults_insert();
        }
        else
        {
            //update
            $defaults = $this->defaults_update();
        }
        foreach($defaults as $k=>$v){
            if(!array_key_exists($k, $this->_modifiedFields)){
                $this->$k=$v;
            }
        }
    }
    function _has($field){
        return array_key_exists($field, $this->_data);
    }
    function _set($field, $value){
        $this->_data[$field] = $value;
        $this->_modifiedFields[$field] = true;
    }
    function save(){
        $this->trigger('before_save');
        $this->defaults();
        parent::save();
        $this->trigger('after_save');
    }
    function on($event, $callback){
        if(!isset($this->events[$event])){
            $this->events[$event] = array();
        }
        $this->events[$event][]=$callback;
    }
    function trigger($event, $data=array()){
        if(isset($this->events[$event])){
            foreach($this->events[$event] as $callback){
                call_user_func_array($callback, $data);
            }
        }
    }
    function toJSON(){
        return json_encode($this->toArray());
    }
    function pluck($fields){
        $data = array();
        if(func_num_args()>1)
        {
            $fields = func_get_args();
        }
        foreach($fields as $field=>$alias){
            if(is_numeric($field)){
                $field = $alias;
            }
            if($this->_has($field)){
                $data[$alias]=$this->$field;
            }
        }
        return $data;
    }
    final public static function register($name, $ns=''){
        $klass_body = <<<EOT
abstract class {$name}_Base extends Et_Model{
    static \$table;
    public static function create(\$record, \$save_now=true)
    {
        \$o = self::table()->createRow();
        \$o->setFromArray(\$record);
        if(\$save_now){
            \$o->save();
        }
        return \$o;
    }
    public static function find(\$keys){
        if(!is_array(\$keys)){
            \$keys = array('id'=>\$keys);
        }
        \$select = self::table()->select();
        foreach(\$keys as \$k=>\$v){
            \$select->where("{\$k}=?", \$v);
        }
        return self::table()->fetchRow(\$select);
    }
    public static function filter(\$keys){
        return self::all(\$keys);
    }
    public static function all(\$keys){
        \$select = self::table()->select();
        foreach(\$keys as \$k=>\$v){
            \$select->where("{\$k}=?", \$v);
        }
        return self::table()->fetchAll(\$select);
    }
    public static function findOrCreate(\$keys, \$defaults=array()){
        \$o = self::find(\$keys);
        if(!\$o){
            return self::create(array_merge(\$keys, \$defaults));
        }
        return \$o;
    }
    public static function buildSelect(\$filters=array()){
        \$select = self::table()->select();
        foreach(\$filters as \$field=>\$value)
        {
            if(is_numeric(\$field)){
                \$select->where(\$value);
            }
            else
            {
                if(strpos(\$field, '?')===false)
                {
                    \$select->where(\$field . '=?', \$value);
                }
                else
                {
                    \$select->where(\$field, \$value);
                }
            }
        }
        return \$select;
    }
    public static function count(\$filters=array())
    {
        \$select = self::buildSelect(\$filters);
        \$select->from(self::table(), array('COUNT(1) AS cnt'));
        \$count = self::table()->fetchRow(\$select);
        return \$count->cnt;
    }
    public static function iterateInStep(\$method, \$filters=array(), \$move=true, \$limit=3000){
        \$select = self::buildSelect(\$filters);
        \$offset = 0;
        @set_time_limit(0);
        while(true){
            \$select->limit(\$limit, \$move?\$offset:0);
            \$offset += \$limit;
            \$rowset = self::table()->fetchAll(\$select);
            if(count(\$rowset)==0){
                break;
            }
            foreach(\$rowset as \$row){
                \$row->\$method();
            }
        }
    }
    public static function table(){
        if(!self::\$table){
            self::\$table = new Zend_Db_Table(array('name'=>substr(strtolower('$name'), strlen('$ns')), 'rowClass'=>'$name'));
        }
        return self::\$table;
    }
}
EOT;
        eval($klass_body);
    }
}

