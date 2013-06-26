-- --------------------------------------------------------
-- Host:                         192.168.41.80
-- Server version:               5.0.51a-24+lenny5 - (Debian)
-- Server OS:                    debian-linux-gnu
-- HeidiSQL version:             7.0.0.4073
-- Date/time:                    2013-06-26 12:29:09
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET FOREIGN_KEY_CHECKS=0 */;

-- Dumping structure for table reader.activity
DROP TABLE IF EXISTS `activity`;
CREATE TABLE IF NOT EXISTS `activity` (
  `id` int(10) unsigned NOT NULL auto_increment COMMENT '编号',
  `member_id` int(10) unsigned NOT NULL COMMENT '用户编号',
  `article_id` int(10) unsigned NOT NULL COMMENT '文章编号',
  `feed_id` int(10) unsigned NOT NULL COMMENT '种子编号',
  `state_starred` tinyint(1) unsigned NOT NULL default '0' COMMENT '是否星标',
  `state_read` tinyint(1) unsigned NOT NULL default '0' COMMENT '是否已读',
  `state_markasread` tinyint(1) unsigned NOT NULL default '0' COMMENT '是否标记已读',
  `state_unread` tinyint(1) unsigned NOT NULL default '1' COMMENT '是否未读',
  `note` varchar(512) NOT NULL COMMENT '备注',
  `tags` varchar(512) NOT NULL COMMENT '标签',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY  (`id`),
  UNIQUE KEY `member_id_article_id` (`member_id`,`article_id`),
  KEY `feed_id` (`feed_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='用户活动记录';

-- Data exporting was unselected.


-- Dumping structure for table reader.article
DROP TABLE IF EXISTS `article`;
CREATE TABLE IF NOT EXISTS `article` (
  `id` int(10) unsigned NOT NULL auto_increment COMMENT '编号',
  `feed_id` int(10) unsigned NOT NULL COMMENT '种子编号',
  `title` varchar(512) NOT NULL COMMENT '标题',
  `author` varchar(512) NOT NULL COMMENT '作者',
  `content` text NOT NULL COMMENT '内容',
  `origin_url` varchar(512) NOT NULL COMMENT '原始地址',
  `published_at` datetime NOT NULL COMMENT '发布时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY  (`id`),
  KEY `feed_id` (`feed_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='文章';

-- Data exporting was unselected.


-- Dumping structure for table reader.category
DROP TABLE IF EXISTS `category`;
CREATE TABLE IF NOT EXISTS `category` (
  `id` int(10) unsigned NOT NULL auto_increment COMMENT '编号',
  `member_id` int(10) unsigned NOT NULL COMMENT '用户',
  `sorting` smallint(5) unsigned NOT NULL default '0' COMMENT '排序序号',
  `name` varchar(512) NOT NULL COMMENT '名称',
  `description` varchar(512) NOT NULL COMMENT '介绍',
  `created_at` datetime NOT NULL COMMENT '创建时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY  (`id`),
  KEY `member_id` (`member_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='分类';

-- Data exporting was unselected.


-- Dumping structure for table reader.feed
DROP TABLE IF EXISTS `feed`;
CREATE TABLE IF NOT EXISTS `feed` (
  `id` int(10) unsigned NOT NULL auto_increment COMMENT '编号',
  `is_private` tinyint(3) unsigned NOT NULL default '0' COMMENT '是否隐私种子',
  `feed_url` varchar(512) NOT NULL COMMENT '种子地址',
  `site_url` varchar(512) NOT NULL COMMENT '网站地址',
  `item_cnt` int(10) unsigned NOT NULL default '0' COMMENT '条目数量',
  `post_per_week` int(10) unsigned NOT NULL default '0' COMMENT '每周帖子数',
  `name` varchar(512) NOT NULL COMMENT '名称',
  `description` varchar(512) NOT NULL COMMENT '介绍',
  `synced_at` datetime NOT NULL COMMENT '同步时间',
  `sync_status` tinyint(4) NOT NULL COMMENT '同步状态',
  `sync_message` varchar(512) NOT NULL COMMENT '同步备注',
  `created_at` datetime NOT NULL COMMENT '加入时间',
  `notified_at` datetime NOT NULL COMMENT '通知更新时间',
  PRIMARY KEY  (`id`),
  KEY `is_private` (`is_private`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='种子';

-- Data exporting was unselected.


-- Dumping structure for table reader.history
DROP TABLE IF EXISTS `history`;
CREATE TABLE IF NOT EXISTS `history` (
  `id` int(10) unsigned NOT NULL auto_increment COMMENT '编号',
  `member_id` int(10) unsigned NOT NULL COMMENT '用户编号',
  `article_id` int(10) unsigned NOT NULL COMMENT '文章编号',
  `state_starred` int(1) unsigned NOT NULL default '0' COMMENT '是否星标',
  `state_read` int(1) unsigned NOT NULL default '0' COMMENT '是否已读',
  `state_markasread` int(1) unsigned NOT NULL default '0' COMMENT '是否标记已读',
  `state_unread` int(1) unsigned NOT NULL default '0' COMMENT '是否未读',
  `note` varchar(512) NOT NULL COMMENT '备注',
  `tags` varchar(512) NOT NULL COMMENT '标签',
  `read_at` datetime NOT NULL COMMENT '阅读时间',
  PRIMARY KEY  (`id`),
  KEY `member_id` (`member_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='阅读记录';

-- Data exporting was unselected.


-- Dumping structure for table reader.member
DROP TABLE IF EXISTS `member`;
CREATE TABLE IF NOT EXISTS `member` (
  `id` int(10) unsigned NOT NULL auto_increment COMMENT '编号',
  `email` varchar(100) NOT NULL COMMENT 'Email',
  `password_digest` char(32) NOT NULL COMMENT '密码摘要',
  `nick_name` varchar(100) NOT NULL COMMENT '昵称',
  `bio` varchar(512) NOT NULL COMMENT '备注',
  `created_at` datetime NOT NULL COMMENT '加入时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  PRIMARY KEY  (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='用户';

-- Data exporting was unselected.


-- Dumping structure for table reader.subscription
DROP TABLE IF EXISTS `subscription`;
CREATE TABLE IF NOT EXISTS `subscription` (
  `id` int(10) unsigned NOT NULL auto_increment COMMENT '编号',
  `member_id` int(10) unsigned NOT NULL COMMENT '用户编号',
  `is_suspended` tinyint(3) unsigned NOT NULL default '0' COMMENT '是否已退订',
  `category_id` int(10) unsigned NOT NULL COMMENT '分类编号',
  `feed_id` int(10) unsigned NOT NULL COMMENT '种子编号',
  `read` int(10) unsigned NOT NULL COMMENT '已读条目数量',
  `starred` int(10) unsigned NOT NULL COMMENT '星标条目数量',
  `unread` int(10) unsigned NOT NULL COMMENT '未读条目数量',
  `markasread` int(10) unsigned NOT NULL COMMENT '标记已读条目数量',
  `custom_name` varchar(512) NOT NULL COMMENT '自定义名称',
  `custom_description` varchar(512) NOT NULL COMMENT '自定义介绍',
  `sort_method` enum('newest','oldest','magic') NOT NULL default 'magic' COMMENT '展示时排序方式',
  `created_at` datetime NOT NULL COMMENT '订阅时间',
  `updated_at` datetime NOT NULL COMMENT '更新时间',
  `suspended_at` datetime NOT NULL COMMENT '退订时间',
  PRIMARY KEY  (`id`),
  KEY `member_id_is_suspended_category_id` (`member_id`,`is_suspended`,`category_id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8 COMMENT='订阅';

-- Data exporting was unselected.
/*!40014 SET FOREIGN_KEY_CHECKS=1 */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
