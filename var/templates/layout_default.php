<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title><?php echo empty($title_for_layout)?'':$title_for_layout . ' - ';?><?php echo $config->site_name;?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="<?php echo ASSETS_URL;?>stylesheets/bootstrap.min.css" rel="stylesheet" media="screen">
    <link href="<?php echo ASSETS_URL;?>stylesheets/bootstrap-responsive.css" rel="stylesheet">
</head>
<body>
    <div class="container-fluid" style="max-width:600px;margin: 120px auto 0;">
        <h1><?php echo $config->site_name;?></h1>
        <a href="<?php echo BASE_URL_ABS;?>">返回阅读界面</a>
        <?php echo $content_for_layout;?>
    </div>
</body>
</html>
