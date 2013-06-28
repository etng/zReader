<?php
$title_for_layout = '导入OPML';
?>
<div class="row-fluid">
    <div class="span2"></div>
    <div class="span8">
        <form action="<?php echo BASE_URL_ABS;?>member/load_opml" method="post" enctype="multipart/form-data" class="form-horizontal">
          <div class="control-group">
            <label class="control-label" for="inputEmail">请提供OPML文件:</label>
            <div class="controls">
                <input  name="opml_file" type="file" class="span4" />
            </div>
          </div>

            <div class="form-actions">
              <button type="submit" class="btn import btn-primary">导入</button>
              <button type="button" class="btn cancel">取消</button>
            </div>

        </form>
    </div>
    <div class="span2"></div>
</div>
