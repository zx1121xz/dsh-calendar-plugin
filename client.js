window.__ModuleLoader__.load({
  id: '@local/calendar-widget',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const {
      useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore,
    } = React;

    let createPortal = null;
    try {
      const reactDom = require('react-dom');
      if (reactDom && typeof reactDom.createPortal === 'function') createPortal = reactDom.createPortal;
    } catch (error) {
      createPortal = null;
    }

    const NS = 'calendar-widget';
    const CARD_WIDTH = 336;
    const DAY_MS = 24 * 60 * 60 * 1000;

    const TERM_NAMES = [
      '小寒', '大寒', '立春', '雨水', '惊蛰', '春分',
      '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
      '小暑', '大暑', '立秋', '处暑', '白露', '秋分',
      '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
    ];

    /* Minutes from the 1900-01-06 02:05 UTC reference, the classic
       twenty-four-term approximation. getUTCDate() yields the Beijing date. */
    const TERM_INFO = [
      0, 21208, 42467, 63836, 85337, 107014, 128867, 150921,
      173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033,
      353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758,
    ];

    const TERM_DESC = {
      '小寒': '冬季第五个节气，公历1月5日至7日交节。冷气积久而寒，小寒标志着一年中最寒冷时节的开始，民间有“小寒时处二三九，天寒地冻冷到抖”的说法。此时宜进补、腌腊味、备年货。',
      '大寒': '二十四节气中的最后一个节气，公历1月20日至21日交节。寒气之逆极，故谓大寒。此时常与岁末重合，民间忙着除旧布新、腌制年肴、准备年货，也意味着冬天即将结束、春天将要到来。',
      '立春': '春季第一个节气，公历2月3日至5日交节。“立”是开始的意思，立春标志着万物闭藏的冬季已经过去，开始进入风和日暖、万物生长的春季。民间有咬春、打春、迎春等习俗。',
      '雨水': '春季第二个节气，公历2月18日至20日交节。降雨开始、雨量渐增，气温回升、冰雪融化，万物萌动。民间有“春雨贵如油”的说法，此时要注意“春捂”，预防倒春寒。',
      '惊蛰': '春季第三个节气，公历3月5日至7日交节。春雷始鸣，惊醒蛰伏于地下越冬的昆虫，故名惊蛰。此时天气转暖、春耕开始，民间有吃梨、打小人、祭白虎等习俗。',
      '春分': '春季第四个节气，公历3月20日至22日交节。太阳直射赤道，昼夜几乎等长，此后北半球白昼渐长。春分也是踏青、放风筝、竖蛋的好时节，农事进入春管、春耕、春种阶段。',
      '清明': '春季第五个节气，公历4月4日至6日交节。气清景明、万物皆显，故名清明。此时气温回升、雨量增多，正是春耕春种的大好时节；清明也是唯一既是节气又是传统节日的日子，扫墓祭祖与踏青郊游并行。',
      '谷雨': '春季最后一个节气，公历4月19日至21日交节。雨生百谷，降水明显增加，利于谷类作物生长。民间有“清明断雪，谷雨断霜”之说，此时也是采春茶、赏牡丹的时节。',
      '立夏': '夏季第一个节气，公历5月5日至7日交节。万物至此皆长大，故名立夏。气温显著升高、雷雨增多，农作物进入旺季生长。民间有称人、斗蛋、吃立夏饭等习俗。',
      '小满': '夏季第二个节气，公历5月20日至22日交节。夏熟作物的籽粒开始灌浆饱满，但还未成熟，只是小满，尚未大满。此时降水增多，民间有祭车神、食苦菜等习俗。',
      '芒种': '夏季第三个节气，公历6月5日至7日交节。有芒的麦子快收，有芒的稻子可种，是一年中农事最繁忙的时节，民间又称“忙种”。此时气温升高、雨量充沛，梅雨季节将至。',
      '夏至': '夏季第四个节气，公历6月21日至22日交节。太阳直射北回归线，北半球白昼最长、黑夜最短。夏至后气温继续升高，进入“热在三伏”的阶段，民间有吃面、消暑等习俗。',
      '小暑': '夏季第五个节气，公历7月6日至8日交节。“暑”是炎热的意思，小暑即小热，天气开始炎热但尚未到最热。此时雷暴、高温、潮湿多发，民间有食新、晒伏、吃藕等习俗。',
      '大暑': '夏季最后一个节气，公历7月22日至24日交节。这是一年中最热的时期，高温酷热、雷雨频繁，也是农作物生长最快的时节。民间有饮伏茶、晒伏姜、烧伏香等消暑习俗。',
      '立秋': '秋季第一个节气，公历8月7日至9日交节。“立”是开始，立秋标志着秋季的开始，但暑热一时难消，常有“秋老虎”。民间有贴秋膘、啃秋、晒秋等习俗。',
      '处暑': '秋季第二个节气，公历8月22日至24日交节。“处”有躲藏、终止之意，处暑表示炎热的暑天即将结束。此时昼夜温差加大、秋意渐浓，民间有放河灯、开渔节、吃鸭子等习俗。',
      '白露': '秋季第三个节气，公历9月7日至9日交节。天气转凉，夜间空气中的水汽在草木上凝结成白色露珠，故名白露。此时昼夜温差可达十多度，民间有收清露、饮白露茶、吃龙眼等习俗。',
      '秋分': '秋季第四个节气，公历9月22日至24日交节。太阳再次直射赤道，昼夜平分，此后北半球昼短夜长。秋分也是中国农民丰收节，民间有祭月、竖蛋、吃秋菜等习俗。',
      '寒露': '秋季第五个节气，公历10月8日至9日交节。露水更多、气温更低，露珠将要凝结成霜，故名寒露。此时秋意更深，民间有赏菊、登高、饮菊花酒、吃芝麻等习俗。',
      '霜降': '秋季最后一个节气，公历10月23日至24日交节。天气渐冷、初霜出现，是秋季到冬季的过渡。民间有“霜降吃柿子，不会流鼻涕”的说法，此时也是赏枫、进补的好时节。',
      '立冬': '冬季第一个节气，公历11月7日至8日交节。冬季开始，万物收藏、规避寒冷。民间有“立冬补冬，补嘴空”的说法，北方吃饺子、南方吃羊肉汤，以迎接寒冬。',
      '小雪': '冬季第二个节气，公历11月22日至23日交节。气温下降，开始降雪但雪量不大，故名小雪。此时北方开始腌腊肉、做香肠，南方有吃糍粑、晒鱼干等习俗。',
      '大雪': '冬季第三个节气，公历12月6日至8日交节。气温显著下降、降雪量增多，地面积雪、天寒地冻。民间有腌肉、观赏封河、进补等习俗，“瑞雪兆丰年”正源于此。',
      '冬至': '冬季第四个节气，公历12月21日至23日交节。太阳直射南回归线，北半球白昼最短、黑夜最长。冬至是数九寒天的开始，民间有“冬至大如年”的说法，北方吃饺子、南方吃汤圆。',
    };

    const FESTIVALS = [
      {
        id: 'new-year',
        name: '元旦',
        rule: { type: 'solar', month: 1, day: 1 },
        desc: '元旦，即公历的1月1日，是世界多数国家通称的“新年”。“元旦”一词古已有之，在汉语中“元”指开始、“旦”指天明，合起来意为“初始之日”。1949年9月，中国人民政治协商会议第一届全体会议决定采用公元纪年法，将公历1月1日正式定为元旦。人们在这一天放假休息、互致祝福，以崭新面貌迎接新的一年。',
      },
      {
        id: 'valentines',
        name: '情人节',
        rule: { type: 'solar', month: 2, day: 14 },
        desc: '情人节，又称圣瓦伦丁节，在每年2月14日。它起源于古罗马的牧神节，后与基督教圣瓦伦丁的传说相结合，逐渐成为表达爱意、互赠礼物的节日。这一天，情侣们常以玫瑰、巧克力、贺卡和约会来庆祝爱情。',
      },
      {
        id: 'womens-day',
        name: '妇女节',
        rule: { type: 'solar', month: 3, day: 8 },
        desc: '国际妇女节，全称“联合国妇女权益和国际和平日”，在每年3月8日。它源于20世纪初欧美妇女争取平等权利、改善劳动条件的斗争；1975年联合国开始庆祝国际妇女节。中国自1924年起纪念妇女节，这一天常以表彰、鲜花和祝福向女性致敬。',
      },
      {
        id: 'arbor-day',
        name: '植树节',
        rule: { type: 'solar', month: 3, day: 12 },
        desc: '植树节，是为激发人们爱林造林热情、促进国土绿化而设立的节日。中国将每年的3月12日定为植树节，这一天也是孙中山先生的逝世纪念日，以纪念他提倡植树造林的主张。每到春季，各地会组织义务植树活动。',
      },
      {
        id: 'april-fools',
        name: '愚人节',
        rule: { type: 'solar', month: 4, day: 1 },
        desc: '愚人节，也称万愚节，在每年4月1日。它起源于法国，后流行于欧美，人们在这一天以善意、无伤大雅的玩笑互相捉弄，被捉弄的人被称为“四月傻瓜”。如今愚人节已成为世界性的趣味节日，但玩笑应以不伤害他人为底线。',
      },
      {
        id: 'labour-day',
        name: '劳动节',
        rule: { type: 'solar', month: 5, day: 1 },
        desc: '国际劳动节，又称“五一国际劳动节”，是世界上80多个国家的全国性节日，定在每年的5月1日。它源于1886年美国芝加哥工人争取八小时工作制的斗争，1889年第二国际成立大会上宣布将5月1日定为国际劳动节。中国自1949年起将5月1日定为法定劳动节，人们以放假、表彰劳动者等方式庆祝。',
      },
      {
        id: 'youth-day',
        name: '青年节',
        rule: { type: 'solar', month: 5, day: 4 },
        desc: '五四青年节，源于1919年5月4日爆发的五四运动。这是一场以青年学生为主体的反帝反封建爱国运动，标志着中国新民主主义革命的开端。1949年12月，中国中央人民政府政务院正式宣布5月4日为中国青年节，以继承和发扬五四精神。',
      },
      {
        id: 'childrens-day',
        name: '儿童节',
        rule: { type: 'solar', month: 6, day: 1 },
        desc: '国际儿童节，定于每年的6月1日，是为了保障世界各国儿童的生存权、保健权和受教育权，改善儿童生活而设立的节日。1949年11月，国际民主妇女联合会在莫斯科决定以每年6月1日为国际儿童节。中国自1949年起将6月1日定为儿童节，孩子们在这一天参加庆祝活动、收到礼物。',
      },
      {
        id: 'party-day',
        name: '建党节',
        rule: { type: 'solar', month: 7, day: 1 },
        desc: '中国共产党建党纪念日，定在每年7月1日。1921年7月，中国共产党第一次全国代表大会在上海召开，宣告中国共产党正式成立。1938年，毛泽东在《论持久战》中提出将7月1日作为党的诞生纪念日。每年这一天，各地会开展纪念活动，回顾党的奋斗历程。',
      },
      {
        id: 'army-day',
        name: '建军节',
        rule: { type: 'solar', month: 8, day: 1 },
        desc: '八一建军节，是中国人民解放军建军纪念日，定在每年8月1日。1927年8月1日，南昌起义打响了武装反抗国民党反动派的第一枪，标志着中国共产党独立领导武装斗争和创建人民军队的开始。1933年，中华苏维埃共和国临时中央政府决定将8月1日定为中国工农红军成立纪念日，后改称中国人民解放军建军节。',
      },
      {
        id: 'teachers-day',
        name: '教师节',
        rule: { type: 'solar', month: 9, day: 10 },
        desc: '教师节，旨在肯定教师为教育事业所做的贡献。中国自古有尊师重教的传统，1985年1月，全国人大常委会决定将每年的9月10日定为教师节。这一天，学生们常以贺卡、鲜花和问候表达对老师的感谢与敬意。',
      },
      {
        id: 'national-day',
        name: '国庆节',
        rule: { type: 'solar', month: 10, day: 1 },
        desc: '国庆节，是纪念中华人民共和国成立的国家法定节日，定在每年10月1日。1949年10月1日，中华人民共和国中央人民政府成立典礼在北京天安门广场隆重举行，此后10月1日成为国庆日。国庆期间全国放假，人们通过升国旗、观看庆典、出游等方式庆祝，天安门广场的国庆花坛和阅兵式尤为引人注目。',
      },
      {
        id: 'singles-day',
        name: '光棍节',
        rule: { type: 'solar', month: 11, day: 11 },
        desc: '光棍节，又称“单身节”，起源于20世纪90年代中国高校的校园文化，因日期“11月11日”形似四根光棍而得名。最初是年轻人自嘲单身、组织联谊的趣味节日；2009年起，电商平台将其打造为“双十一”购物狂欢节，成为全球规模最大的网络购物活动之一。',
      },
      {
        id: 'christmas-eve',
        name: '平安夜',
        rule: { type: 'solar', month: 12, day: 24 },
        desc: '平安夜，即圣诞前夕，在每年12月24日。它原是基督教庆祝耶稣诞生的前夕，如今已成为世界性的节日。人们在这一天装饰圣诞树、交换礼物、唱圣诞颂歌、享用节日晚餐；在中国，平安夜还有互赠“平安果”（苹果）的习俗，取“平安”谐音。',
      },
      {
        id: 'christmas',
        name: '圣诞节',
        rule: { type: 'solar', month: 12, day: 25 },
        desc: '圣诞节，是纪念耶稣诞生的基督教节日，在每年12月25日，也是西方最重要的节日之一。圣诞节有布置圣诞树、挂圣诞袜、交换礼物、吃圣诞大餐等习俗；圣诞老人驾着驯鹿雪橇送礼物的传说深受孩子们喜爱。如今它已成为许多国家和地区共同的冬季节日。',
      },
      {
        id: 'laba',
        name: '腊八节',
        rule: { type: 'lunar', month: 12, day: 8 },
        desc: '腊八节，俗称“腊八”，即农历十二月初八。古人在岁末用猎物祭祀祖先和神灵，祈求丰收吉祥，后逐渐演变为喝腊八粥、泡腊八蒜的习俗。腊八粥由米、豆、枣、果等熬制而成，寓意五谷丰登、吉祥如意；民间也有“过了腊八就是年”的说法。',
      },
      {
        id: 'little-new-year',
        name: '小年',
        rule: { type: 'lunar', month: 12, day: 23 },
        desc: '小年，通常指农历腊月二十三（北方）或二十四（南方），是春节前的重要节日。民间传说这一天灶王爷要上天汇报一家善恶，因此有祭灶、吃灶糖的习俗，寓意“上天言好事，下界保平安”。从小年起，人们开始扫尘、备年货，正式进入“忙年”阶段。',
      },
      {
        id: 'lunar-new-years-eve',
        name: '除夕',
        rule: { type: 'lunar-eve' },
        desc: '除夕，又称大年夜、除夕夜、除夜等，是农历年的最后一个晚上。“除”意为去除，“夕”指夜晚，除夕有旧岁至此而除、来年另换新岁的意思。这一天家家户户贴春联、挂灯笼、吃年夜饭、守岁，辞旧迎新，是中国人最重要的团圆时刻之一。',
      },
      {
        id: 'spring-festival',
        name: '春节',
        rule: { type: 'lunar', month: 1, day: 1 },
        desc: '春节，即农历新年，俗称“过年”，是中国最隆重、最热闹的传统节日。春节起源于上古时代的岁首祈岁祭祀，承载着团圆、感恩、祈福的文化内涵。节日期间人们贴春联、放鞭炮、拜年、发压岁钱、舞龙舞狮，活动一直延续到元宵节。',
      },
      {
        id: 'lantern-festival',
        name: '元宵节',
        rule: { type: 'lunar', month: 1, day: 15 },
        desc: '元宵节，又称上元节、小正月、元夕或灯节，为每年农历正月十五。正月是农历的元月，古人称夜为“宵”，所以把一年中第一个月圆之夜称为元宵节。元宵节主要有赏花灯、吃汤圆、猜灯谜、放烟花等习俗，也是春节年俗活动的压轴戏。',
      },
      {
        id: 'dragon-heads-raise',
        name: '龙抬头',
        rule: { type: 'lunar', month: 2, day: 2 },
        desc: '龙抬头，又称春耕节、农事节、青龙节、春龙节等，在每年农历二月初二。“龙”指的是二十八宿中的东方苍龙七宿，仲春时节角宿从东方地平线升起，故称“龙抬头”。民间有剃龙头、吃龙食、祭祀土地神等习俗，寓意风调雨顺、五谷丰登。',
      },
      {
        id: 'shangsi',
        name: '上巳节',
        rule: { type: 'lunar', month: 3, day: 3 },
        desc: '上巳节，俗称三月三，是中国古老的传统节日，在每年农历三月初三。古时人们在这一天到水边沐浴、祭祀宴饮、曲水流觞，以祓除不祥；后来也逐渐成为踏青游春、男女相会的日子。部分少数民族至今仍保留盛大的“三月三”歌会习俗。',
      },
      {
        id: 'hanshi',
        name: '寒食节',
        rule: { type: 'term-offset', term: 6, offset: -1 },
        desc: '寒食节，在冬至后的第105天，通常在清明节前一二日。相传春秋时期晋文公为纪念介子推，下令在其忌日禁火寒食，遂成寒食节。寒食节禁烟火、吃冷食，并有祭扫、踏青、秋千、蹴鞠等习俗，后来逐渐与清明节融合。',
      },
      {
        id: 'qingming',
        name: '清明节',
        rule: { type: 'term', term: 6 },
        desc: '清明节，又称踏青节、行清节、三月节、祭祖节等，在每年4月4日至6日之间，是祭祀、祭祖和扫墓的节日。清明节源自上古时代的祖先信仰与春祭礼俗，兼具自然与人文两大内涵，既是自然节气点，也是传统节日。清明节与春节、端午节、中秋节并称为中国四大传统节日。',
      },
      {
        id: 'dragon-boat',
        name: '端午节',
        rule: { type: 'lunar', month: 5, day: 5 },
        desc: '端午节，又称端阳节、龙舟节、重午节、天中节等，在每年农历五月初五，是中国四大传统节日之一。端午节源自天象崇拜，由上古时代祭龙演变而来，后因纪念爱国诗人屈原而广为流传。节日习俗有赛龙舟、吃粽子、挂艾草菖蒲、佩香囊、系五彩绳等，寄托着祈福辟邪、健康平安的愿望。',
      },
      {
        id: 'qixi',
        name: '七夕节',
        rule: { type: 'lunar', month: 7, day: 7 },
        desc: '七夕节，又称七巧节、七姐节、女儿节、乞巧节等，在每年农历七月初七。七夕由星宿崇拜衍化而来，因牛郎织女的爱情传说而成为象征爱情的节日。民间有穿针乞巧、拜织女、吃巧果等习俗，2006年被列入第一批国家级非物质文化遗产名录。',
      },
      {
        id: 'zhongyuan',
        name: '中元节',
        rule: { type: 'lunar', month: 7, day: 15 },
        desc: '中元节，俗称“七月半”“鬼节”“施孤”，在每年农历七月十五，部分地区为七月十四。中元节源于上古时代的祖灵崇拜以及秋尝祭祀，是追怀先人、祭祀祖先的传统节日，与除夕、清明节、重阳节并称中国传统的四大祭祖节日。民间有祭祖、放河灯、焚纸锭等习俗。',
      },
      {
        id: 'mid-autumn',
        name: '中秋节',
        rule: { type: 'lunar', month: 8, day: 15 },
        desc: '中秋节，又称祭月节、月光诞、月夕、秋节、团圆节等，在每年农历八月十五，是中国四大传统节日之一。中秋节源自天象崇拜，由上古时代秋夕祭月演变而来，以月之圆兆人之团圆，寄托思念故乡、思念亲人之情。节日习俗有赏月、吃月饼、玩花灯、赏桂花、饮桂花酒等。',
      },
      {
        id: 'double-ninth',
        name: '重阳节',
        rule: { type: 'lunar', month: 9, day: 9 },
        desc: '重阳节，又称重九节、晒秋节、踏秋节、老人节等，在每年农历九月初九。古人以“九”为阳数，两九相重，故称重阳。重阳节有登高远眺、赏菊、插茱萸、吃重阳糕、饮菊花酒等习俗，寓意健康长寿；2012年起，中国将每年农历九月初九定为老年节。',
      },
      {
        id: 'hanyi',
        name: '寒衣节',
        rule: { type: 'lunar', month: 10, day: 1 },
        desc: '寒衣节，又称“十月朝”“祭祖节”“冥阴节”，在每年农历十月初一，与清明节、中元节并称中国三大“鬼节”。天气渐寒，人们在这一天祭扫祖先、焚烧纸制寒衣，为逝去的亲人送去御寒衣物，表达缅怀与孝思。',
      },
      {
        id: 'xiayuan',
        name: '下元节',
        rule: { type: 'lunar', month: 10, day: 15 },
        desc: '下元节，又称“下元日”“下元”，在每年农历十月十五。道教将正月十五、七月十五、十月十五分别称为上元、中元、下元，下元节是水官大帝解厄的日子。民间有祭祖、祈愿、吃麻腐包子等习俗，祈求消灾解厄、平安顺遂。',
      },
      {
        id: 'mothers-day',
        name: '母亲节',
        rule: { type: 'nth-weekday', month: 5, weekday: 0, nth: 2 },
        desc: '母亲节，是一个感谢母亲的节日，在每年5月的第二个星期日。现代母亲节起源于美国，由安娜·贾维斯发起，1914年美国国会正式确立。这一天人们通常送给母亲康乃馨、贺卡或礼物，表达对母亲养育之恩的感激；中国也有以萱草花象征母爱的传统。',
      },
      {
        id: 'fathers-day',
        name: '父亲节',
        rule: { type: 'nth-weekday', month: 6, weekday: 0, nth: 3 },
        desc: '父亲节，是感恩父亲的节日，在每年6月的第三个星期日。现代父亲节起源于美国，1910年由索诺拉·多德在华盛顿州发起，1972年美国正式将其定为全国性节日。这一天人们通过送礼物、聚餐、陪伴等方式表达对父亲的敬意与感谢。',
      },
      {
        id: 'thanksgiving',
        name: '感恩节',
        rule: { type: 'nth-weekday', month: 11, weekday: 4, nth: 4 },
        desc: '感恩节，起源于美国，在每年11月的第四个星期四。它最初是为了感谢印第安人帮助早期移民度过寒冬，后来成为感谢生命中一切恩赐的节日。美国人在这一天阖家团聚、吃火鸡大餐；这一习俗也逐渐被世界各地的人们所接受。',
      },
    ];

    const DICT = {
      zh: {
        lunar: '农历',
        solarTerm: '节气',
        festival: '节日',
        nextTerm: '下一个节气',
        nextFestival: '下一个节日',
        close: '关闭',
        upcomingPrefix: '',
        daysUnit: '天后',
        widgetLabel: '今日日期、农历、节气与节日',
      },
      en: {
        lunar: 'Lunar',
        solarTerm: 'Solar term',
        festival: 'Festival',
        nextTerm: 'Next solar term',
        nextFestival: 'Next festival',
        close: 'Close',
        upcomingPrefix: 'in ',
        daysUnit: ' days',
        widgetLabel: 'Today’s date, lunar date, solar term and festivals',
      },
    };

    const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTH_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const LUNAR_MONTH_NUM = {
      '正月': 1, '一月': 1, '二月': 2, '三月': 3, '四月': 4, '五月': 5, '六月': 6,
      '七月': 7, '八月': 8, '九月': 9, '十月': 10, '十一月': 11, '冬月': 11,
      '十二月': 12, '腊月': 12,
    };
    const ZODIAC = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

    const lunarFormat = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const lunarCache = new Map();
    const termCache = new Map();

    function startOfDay(date) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function addDays(date, amount) {
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
    }

    function daysBetween(from, to) {
      return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
    }

    function sameDay(a, b) {
      return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
    }

    function lunarDayName(day) {
      if (day <= 0) return '';
      if (day <= 10) return '初' + '一二三四五六七八九十'[day - 1];
      if (day < 20) return '十' + '一二三四五六七八九'[day - 11];
      if (day === 20) return '二十';
      if (day < 30) return '廿' + '一二三四五六七八九'[day - 21];
      return '三十';
    }

    function lunarOf(date) {
      const key = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
      const cached = lunarCache.get(key);
      if (cached) return cached;

      const parts = lunarFormat.formatToParts(date);
      let monthName = '';
      let dayRaw = '';
      let yearName = '';
      let relatedYear = date.getFullYear();

      for (const part of parts) {
        if (part.type === 'month') monthName = part.value;
        else if (part.type === 'day') dayRaw = part.value;
        else if (part.type === 'yearName') yearName = part.value;
        else if (part.type === 'relatedYear') relatedYear = Number(part.value) || relatedYear;
      }

      let isLeap = false;
      if (monthName.charAt(0) === '闰') {
        isLeap = true;
        monthName = monthName.slice(1);
      }

      const month = LUNAR_MONTH_NUM[monthName] || 1;
      const day = parseInt(String(dayRaw).replace(/[^\d]/g, ''), 10) || 1;
      const dayName = lunarDayName(day);
      const result = {
        month,
        day,
        dayName,
        isLeap,
        monthName,
        yearName,
        relatedYear,
        zodiac: ZODIAC[((relatedYear - 4) % 12 + 12) % 12],
        text: (isLeap ? '闰' : '') + monthName + dayName,
      };

      if (lunarCache.size > 400) lunarCache.clear();
      lunarCache.set(key, result);
      return result;
    }

    function termDayOfYear(year, index) {
      const ms = 31556925974.7 * (year - 1900)
        + TERM_INFO[index] * 60000
        + Date.UTC(1900, 0, 6, 2, 5);
      return new Date(ms).getUTCDate();
    }

    function termsOfYear(year) {
      const cached = termCache.get(year);
      if (cached) return cached;
      const list = TERM_NAMES.map((name, index) => {
        const month = Math.floor(index / 2) + 1;
        const day = termDayOfYear(year, index);
        return { index, name, month, day, date: new Date(year, month - 1, day) };
      });
      termCache.set(year, list);
      return list;
    }

    function termContext(date) {
      const today = startOfDay(date);
      const year = today.getFullYear();
      const all = [
        ...termsOfYear(year - 1),
        ...termsOfYear(year),
        ...termsOfYear(year + 1),
      ];
      let current = null;
      let next = null;
      for (const term of all) {
        if (term.date.getTime() <= today.getTime()) current = term;
        else {
          next = term;
          break;
        }
      }
      return { current, next };
    }

    function termOn(date) {
      return termsOfYear(date.getFullYear()).find((term) => sameDay(term.date, date)) || null;
    }

    function festivalMatches(rule, date, lunar, tomorrow, term) {
      if (rule.type === 'solar') {
        return date.getMonth() + 1 === rule.month && date.getDate() === rule.day;
      }
      if (rule.type === 'lunar') {
        return !lunar.isLeap && lunar.month === rule.month && lunar.day === rule.day;
      }
      if (rule.type === 'lunar-eve') {
        return !tomorrow.isLeap && tomorrow.month === 1 && tomorrow.day === 1;
      }
      if (rule.type === 'term') {
        return Boolean(term) && term.index === rule.term;
      }
      if (rule.type === 'term-offset') {
        const anchor = termsOfYear(date.getFullYear())[rule.term];
        return daysBetween(anchor.date, date) === rule.offset;
      }
      if (rule.type === 'nth-weekday') {
        return date.getMonth() + 1 === rule.month
          && date.getDay() === rule.weekday
          && Math.ceil(date.getDate() / 7) === rule.nth;
      }
      return false;
    }

    function festivalsOn(date, term) {
      const lunar = lunarOf(date);
      const tomorrow = lunarOf(addDays(date, 1));
      const resolvedTerm = term === undefined ? termOn(date) : term;
      const list = [];
      for (const festival of FESTIVALS) {
        if (festivalMatches(festival.rule, date, lunar, tomorrow, resolvedTerm)) list.push(festival);
      }
      return list;
    }

    function nextFestivalAfter(date) {
      for (let offset = 1; offset <= 60; offset += 1) {
        const candidate = addDays(date, offset);
        const festivals = festivalsOn(candidate, termOn(candidate));
        if (festivals.length) {
          return { date: candidate, festival: festivals[0], daysAway: offset };
        }
      }
      return null;
    }

    function buildModel(now) {
      const today = startOfDay(now);
      const lunar = lunarOf(today);
      const { current, next } = termContext(today);
      const todaysFestivals = current ? festivalsOn(today, current) : [];
      const items = [];

      if (current) {
        items.push({
          key: 'term:' + current.index,
          kind: 'term',
          name: current.name,
          date: current.date,
          description: TERM_DESC[current.name] || '',
        });
      }

      for (const festival of todaysFestivals) {
        items.push({
          key: 'festival:' + festival.id,
          kind: 'festival',
          name: festival.name,
          date: today,
          description: festival.desc,
        });
      }

      const upcoming = nextFestivalAfter(today);
      let upcomingItem = null;
      if (upcoming) {
        upcomingItem = {
          key: 'festival:' + upcoming.festival.id,
          kind: 'festival',
          name: upcoming.festival.name,
          date: upcoming.date,
          description: upcoming.festival.desc,
          upcoming: true,
          daysAway: upcoming.daysAway,
        };
      }

      return { today, lunar, current, next, todaysFestivals, items, upcoming, upcomingItem };
    }

    function fmtDate(date, isZh) {
      if (isZh) return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
      return `${MONTH_EN[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
    }

    function fmtShort(date, isZh) {
      if (isZh) return `${date.getMonth() + 1}月${date.getDate()}日`;
      return `${MONTH_EN[date.getMonth()]} ${date.getDate()}`;
    }

    const CSS = `
.cw-root{display:flex;align-items:center;gap:9px;height:38px;min-width:0;max-width:min(380px,44vw);margin-right:6px;user-select:none;font-family:inherit;line-height:1.2;-webkit-app-region:no-drag}
.cw-tile{flex:none;box-sizing:border-box;width:37px;height:38px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;background:var(--dsw-alias-bg-layer-2);box-shadow:0 1px 2px rgba(15,23,42,.05);overflow:hidden}
.cw-tile-month{font-size:9.5px;line-height:12px;font-weight:600;letter-spacing:.04em;color:var(--dsw-alias-brand-primary);white-space:nowrap}
.cw-tile-day{font-size:17px;line-height:19px;font-weight:700;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}
.cw-tile-year{display:none}
.cw-text{display:flex;flex-direction:column;justify-content:center;gap:2px;min-width:0}
.cw-date{font-size:12.5px;line-height:16px;font-weight:600;letter-spacing:.005em;color:var(--dsw-alias-label-primary);white-space:nowrap}
.cw-sub{display:flex;align-items:center;gap:5px;min-width:0;overflow:hidden;white-space:nowrap;font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary)}
.cw-lunar{flex:none}
.cw-sep{flex:none;margin:0 -1px;opacity:.5}
.cw-chips{display:flex;align-items:center;gap:4px;min-width:0;overflow:hidden}
.cw-chip{display:inline-flex;align-items:center;flex:none;box-sizing:border-box;height:18px;padding:0 6px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;background:var(--dsw-alias-bg-layer-2);font:inherit;font-size:10.5px;line-height:16px;font-weight:500;white-space:nowrap;cursor:pointer;color:var(--dsw-alias-brand-primary);transition:background-color .12s ease,border-color .12s ease}
.cw-chip::before{content:'';flex:none;width:4px;height:4px;margin-right:4px;border-radius:50%;background:currentColor;opacity:.72}
.cw-chip-festival{color:var(--dsw-alias-state-warn-primary)}
.cw-chip-upcoming{color:var(--dsw-alias-label-secondary);border-style:dashed}
.cw-chip:hover,.cw-chip:focus-visible,.cw-chip[aria-expanded="true"]{background:var(--dsw-alias-bg-layer-1);border-color:var(--dsw-alias-border-l2)}
.cw-chip:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.cw-card{position:fixed;z-index:2147483000;box-sizing:border-box;padding:15px 16px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);box-shadow:0 18px 44px rgba(15,23,42,.22),0 2px 8px rgba(15,23,42,.12);overflow:auto;overscroll-behavior:contain;font-family:inherit;line-height:1.5;animation:cw-fade .14s ease-out;-webkit-app-region:no-drag}
.cw-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:12px 12px 0 0;background:var(--cw-accent)}
.cw-card-term{--cw-accent:var(--dsw-alias-brand-primary)}
.cw-card-festival{--cw-accent:var(--dsw-alias-state-warn-primary)}
@keyframes cw-fade{from{opacity:0}to{opacity:1}}
.cw-card-head{display:flex;align-items:center;gap:8px;padding-right:20px}
.cw-badge{flex:none;display:inline-flex;align-items:center;height:18px;padding:0 5px;border:1px solid var(--cw-accent);border-radius:4px;color:var(--cw-accent);font-size:10px;line-height:16px;font-weight:600;letter-spacing:.06em;white-space:nowrap}
.cw-card-title{margin:0;font-size:16px;line-height:22px;font-weight:600;letter-spacing:.01em;color:var(--dsw-alias-label-primary)}
.cw-card-meta{margin-top:4px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.cw-card-rule{height:1px;margin:11px 0 10px;background:var(--dsw-alias-border-l1)}
.cw-card-desc{margin:0;font-size:12.5px;line-height:1.78;color:var(--dsw-alias-label-primary);text-wrap:pretty}
.cw-card-foot{margin-top:11px;padding-top:9px;border-top:1px dashed var(--dsw-alias-border-l1);font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-secondary)}
.cw-close{position:absolute;top:8px;right:8px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:15px;line-height:1;cursor:pointer}
.cw-close:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.cw-bg{position:fixed;left:0;top:0;box-sizing:border-box;width:158px;height:92px;margin:0;padding-top:2px;gap:8px;align-items:flex-start;opacity:.42;pointer-events:none;z-index:0;filter:saturate(.9);transition:opacity .18s ease;-webkit-mask-image:linear-gradient(to right,#000 0,#000 82%,transparent 100%);mask-image:linear-gradient(to right,#000 0,#000 82%,transparent 100%)}
.cw-bg-lit{opacity:.96}
.cw-bg:has(.cw-chip:hover),.cw-bg:focus-within{opacity:.96}
.cw-bg .cw-tile{width:58px;height:86px;border-color:transparent;background:transparent;box-shadow:none}
.cw-bg .cw-tile-year{display:block;font-size:8px;line-height:10px;font-weight:600;letter-spacing:.08em;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.cw-bg .cw-tile-month{font-size:10px;line-height:12px;color:var(--dsw-alias-brand-primary)}
.cw-bg .cw-tile-day{font-size:50px;line-height:50px;letter-spacing:-.04em;color:var(--dsw-alias-label-primary)}
.cw-bg .cw-text{gap:2px;max-width:158px}
.cw-bg .cw-date{font-size:13px;line-height:17px;font-weight:600;color:var(--dsw-alias-label-primary)}
.cw-bg .cw-sub{display:flex;flex-direction:column;align-items:flex-start;gap:3px;overflow:visible;white-space:normal}
.cw-bg .cw-lunar{font-size:10.5px;line-height:14px;color:var(--dsw-alias-label-secondary)}
.cw-bg .cw-sep{display:none}
.cw-bg .cw-chips{pointer-events:auto;gap:4px;overflow:visible}
.cw-bg .cw-chip{height:16px;padding:0 5px;font-size:9.5px;line-height:14px;border-color:transparent;background:transparent;border-radius:4px}
.cw-bg .cw-chip::before{width:3px;height:3px;margin-right:3px}
.cw-bg .cw-chip:hover,.cw-bg .cw-chip:focus-visible,.cw-bg .cw-chip[aria-expanded="true"]{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1)}
.cw-head{position:fixed;left:0;top:0;box-sizing:border-box;width:248px;height:56px;max-width:248px;margin:0;padding:6px 12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;opacity:.94;pointer-events:none;z-index:2;box-shadow:0 4px 14px rgba(0,0,0,.12);transition:opacity .18s ease}
.cw-head .cw-text{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;max-width:224px;min-width:0}
.cw-head .cw-date{font-size:12.5px;line-height:16px;font-weight:600;color:var(--dsw-alias-label-primary);white-space:nowrap}
.cw-head .cw-sub{display:flex;flex-direction:row;align-items:center;justify-content:center;gap:5px;overflow:visible;white-space:nowrap}
.cw-head .cw-lunar{font-size:10.5px;line-height:13px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.cw-head .cw-sep{display:inline;margin:0;opacity:.5}
.cw-head .cw-chips{pointer-events:auto;gap:4px;overflow:visible;justify-content:center}
.cw-head .cw-chip{height:16px;padding:0 5px;font-size:9.5px;line-height:14px;border-color:transparent;background:transparent;border-radius:4px}
.cw-head .cw-chip::before{width:3px;height:3px;margin-right:3px}
.cw-head .cw-chip:hover,.cw-head .cw-chip:focus-visible,.cw-head .cw-chip[aria-expanded="true"]{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1)}
`;

    function CalendarWidget({ ctx, variant, anchorPos }) {
      const isHeader = variant === 'header';
      const [now, setNow] = useState(() => new Date());
      const [active, setActive] = useState(null);
      const [position, setPosition] = useState(null);
      const wrapRef = useRef(null);
      const cardRef = useRef(null);
      const chipRefs = useRef({});
      const closeTimer = useRef(0);

      const locale = useSyncExternalStore(
        useCallback((callback) => ctx.locale.subscribe(callback), [ctx]),
        useCallback(() => ctx.locale.getSnapshot().active || 'zh', [ctx]),
        useCallback(() => 'zh', [ctx]),
      );
      const isZh = !locale || String(locale).toLowerCase().indexOf('zh') === 0;
      const t = useMemo(() => ctx.locale.bind(NS), [ctx, locale]);

      useEffect(() => {
        let timer = 0;
        const schedule = () => {
          if (timer) window.clearTimeout(timer);
          const current = new Date();
          const nextMidnight = new Date(
            current.getFullYear(), current.getMonth(), current.getDate() + 1, 0, 0, 1,
          );
          const delay = Math.min(
            Math.max(nextMidnight.getTime() - current.getTime(), 1000),
            2147483647,
          );
          timer = window.setTimeout(() => {
            setNow(new Date());
            schedule();
          }, delay);
        };
        schedule();
        const onVisible = () => {
          if (!document.hidden) setNow(new Date());
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => {
          window.clearTimeout(timer);
          document.removeEventListener('visibilitychange', onVisible);
        };
      }, []);

      const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      const model = useMemo(() => buildModel(now), [dateKey]);
      const chips = model.items.slice();
      if (!model.todaysFestivals.length && model.upcomingItem) chips.push(model.upcomingItem);
      const activeItem = active ? chips.find((item) => item.key === active.key) || null : null;

      const clearClose = useCallback(() => {
        if (closeTimer.current) {
          window.clearTimeout(closeTimer.current);
          closeTimer.current = 0;
        }
      }, []);

      const scheduleClose = useCallback(() => {
        clearClose();
        closeTimer.current = window.setTimeout(() => {
          setActive((current) => (current && !current.pinned ? null : current));
        }, 180);
      }, [clearClose]);

      const openPreview = useCallback((key) => {
        clearClose();
        setActive((current) => (current && current.key === key ? current : { key, pinned: false }));
      }, [clearClose]);

      const togglePinned = useCallback((key) => {
        clearClose();
        setActive((current) => {
          if (current && current.key === key) {
            return current.pinned ? null : { key, pinned: true };
          }
          return { key, pinned: true };
        });
      }, [clearClose]);

      useEffect(() => () => clearClose(), [clearClose]);

      useEffect(() => {
        if (active && !activeItem) setActive(null);
      }, [active, activeItem]);

      const updatePosition = useCallback(() => {
        if (!active) return;
        const anchor = chipRefs.current[active.key];
        if (!anchor) return;
        const rect = anchor.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 8;
        const width = Math.min(CARD_WIDTH, viewportWidth - margin * 2);
        let left = rect.left + rect.width / 2 - width / 2;
        left = Math.min(Math.max(left, margin), viewportWidth - width - margin);

        const spaceBelow = viewportHeight - rect.bottom - 12;
        const spaceAbove = rect.top - 12;
        const placeBelow = spaceBelow >= 260 || spaceBelow >= spaceAbove;
        let top;
        let maxHeight;
        let transform;
        if (placeBelow) {
          top = rect.bottom + 8;
          maxHeight = Math.max(160, viewportHeight - top - margin);
          transform = 'none';
        } else {
          top = rect.top - 8;
          maxHeight = Math.max(160, spaceAbove - 8);
          transform = 'translateY(-100%)';
        }
        setPosition({ left, top, width, maxHeight, transform });
      }, [active]);

      useLayoutEffect(() => {
        if (active) updatePosition();
        else setPosition(null);
      }, [active, updatePosition, locale]);

      useEffect(() => {
        if (!active) return undefined;
        const onViewportChange = () => updatePosition();
        window.addEventListener('resize', onViewportChange);
        window.addEventListener('scroll', onViewportChange, true);
        return () => {
          window.removeEventListener('resize', onViewportChange);
          window.removeEventListener('scroll', onViewportChange, true);
        };
      }, [active, updatePosition]);

      useEffect(() => {
        if (!active) return undefined;
        const onPointerDown = (event) => {
          const target = event.target;
          if (cardRef.current && cardRef.current.contains(target)) return;
          if (wrapRef.current && wrapRef.current.contains(target)) return;
          setActive(null);
        };
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setActive(null);
        };
        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true);
          document.removeEventListener('keydown', onKeyDown);
        };
      }, [active]);

      const kindLabel = (kind) => (kind === 'term' ? t('solarTerm') : t('festival'));

      const footerFor = (item) => {
        if (item.kind === 'term' && model.next) {
          return `${t('nextTerm')} · ${model.next.name} · ${fmtShort(model.next.date, isZh)}`;
        }
        if (item.kind === 'festival' && !item.upcoming && model.upcoming) {
          return `${t('nextFestival')} · ${model.upcoming.festival.name} · ${t('upcomingPrefix')}${model.upcoming.daysAway}${t('daysUnit')}`;
        }
        if (model.next) {
          return `${t('nextTerm')} · ${model.next.name} · ${fmtShort(model.next.date, isZh)}`;
        }
        return '';
      };

      const renderChip = (item) => {
        const expanded = Boolean(active && active.key === item.key);
        const label = item.upcoming
          ? `${item.name} · ${t('upcomingPrefix')}${item.daysAway}${t('daysUnit')}`
          : item.name;
        return h('button', {
          key: item.key,
          type: 'button',
          ref: (element) => {
            if (element) chipRefs.current[item.key] = element;
            else delete chipRefs.current[item.key];
          },
          className: 'cw-chip cw-chip-' + item.kind + (item.upcoming ? ' cw-chip-upcoming' : ''),
          'aria-haspopup': 'dialog',
          'aria-expanded': expanded,
          'aria-controls': expanded ? 'calendar-widget-card' : undefined,
          'aria-label': kindLabel(item.kind) + ' ' + item.name,
          onClick: () => togglePinned(item.key),
          onMouseEnter: () => openPreview(item.key),
          onMouseLeave: scheduleClose,
          onFocus: () => openPreview(item.key),
        }, label);
      };

      const card = (() => {
        if (!activeItem || !position) return null;
        const metaParts = [fmtDate(activeItem.date, isZh)];
        if (activeItem.kind === 'term') metaParts.push(t('solarTerm'));
        else if (activeItem.upcoming) metaParts.push(`${t('upcomingPrefix')}${activeItem.daysAway}${t('daysUnit')}`);
        else metaParts.push(t('festival'));
        const footer = footerFor(activeItem);

        const node = h('div', {
          ref: cardRef,
          id: 'calendar-widget-card',
          className: 'cw-card cw-card-' + activeItem.kind,
          role: 'dialog',
          'aria-modal': 'false',
          'aria-labelledby': 'calendar-widget-card-title',
          style: {
            left: position.left + 'px',
            top: position.top + 'px',
            width: position.width + 'px',
            maxHeight: position.maxHeight + 'px',
            transform: position.transform,
          },
          onMouseEnter: clearClose,
          onMouseLeave: scheduleClose,
        },
          h('button', {
            key: 'close',
            type: 'button',
            className: 'cw-close',
            'aria-label': t('close'),
            onClick: () => setActive(null),
          }, '×'),
          h('div', { key: 'head', className: 'cw-card-head' },
            h('span', { className: 'cw-badge' }, kindLabel(activeItem.kind)),
            h('h3', { className: 'cw-card-title', id: 'calendar-widget-card-title' }, activeItem.name),
          ),
          h('div', { key: 'meta', className: 'cw-card-meta' }, metaParts.join(' · ')),
          h('div', { key: 'rule', className: 'cw-card-rule', 'aria-hidden': 'true' }),
          h('p', { key: 'desc', className: 'cw-card-desc' }, activeItem.description),
          footer ? h('div', { key: 'foot', className: 'cw-card-foot' }, footer) : null,
        );

        return createPortal ? createPortal(node, document.body) : node;
      })();

      const dateText = isZh
        ? `${model.today.getFullYear()}年${model.today.getMonth() + 1}月${model.today.getDate()}日 ${WEEKDAY_ZH[model.today.getDay()]}`
        : `${MONTH_EN[model.today.getMonth()]} ${model.today.getDate()}, ${model.today.getFullYear()} · ${WEEKDAY_EN[model.today.getDay()]}`;
      const bgDateText = isZh
        ? `${model.today.getMonth() + 1}月${model.today.getDate()}日 ${WEEKDAY_ZH[model.today.getDay()]}`
        : `${MONTH_EN[model.today.getMonth()]} ${model.today.getDate()} · ${WEEKDAY_EN[model.today.getDay()]}`;
      const lunarText = isZh
        ? t('lunar') + model.lunar.text
        : t('lunar') + ' ' + model.lunar.text;

      const rootNode = h('div', {
        ref: wrapRef,
        className: isHeader
          ? 'cw-root cw-head'
          : 'cw-root',
        role: 'group',
        'aria-label': t('widgetLabel'),
        style: isHeader && anchorPos
          ? { left: `${anchorPos.left}px`, top: `${anchorPos.top}px` }
          : undefined,
      },
        isHeader ? null : h('div', { className: 'cw-tile', 'aria-hidden': 'true' },
          h('span', { className: 'cw-tile-year' }, String(model.today.getFullYear())),
          h('span', { className: 'cw-tile-month' }, isZh
            ? `${model.today.getMonth() + 1}月`
            : MONTH_EN[model.today.getMonth()].toUpperCase()),
          h('span', { className: 'cw-tile-day' }, String(model.today.getDate())),
        ),
        h('div', { className: 'cw-text' },
          h('div', { className: 'cw-date' }, isHeader ? bgDateText : dateText),
          h('div', { className: 'cw-sub' },
            h('span', { className: 'cw-lunar' }, lunarText),
            h('span', { className: 'cw-sep', 'aria-hidden': 'true' }, '·'),
            h('div', { className: 'cw-chips' }, chips.map(renderChip)),
          ),
        ),
      );

      return h(React.Fragment, null,
        h('style', { key: 'style' }, CSS),
        isHeader && createPortal ? createPortal(rootNode, document.body) : rootNode,
        card,
      );
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, 'zh', DICT.zh), 'calendar-widget: zh strings');
        ctx.effect(() => ctx.locale.register(NS, 'en', DICT.en), 'calendar-widget: en strings');

        function CalendarBackgroundSlot() {
          const anchorRef = useRef(null);
          const [anchorPos, setAnchorPos] = useState(null);

          useLayoutEffect(() => {
            let frame = 0;
            const measure = () => {
              const el = anchorRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();

              /* Center a compact card in the conversation header, above the tab row. */
              let tabRect = null;
              let tabNode = null;
              const tabLists = document.querySelectorAll('[role="tablist"]');
              for (let i = 0; i < tabLists.length; i += 1) {
                const tr = tabLists[i].getBoundingClientRect();
                if (tr.width > 100 && tr.height >= 18 && tr.top >= rect.top - 40
                  && tr.left >= rect.left - 80 && tr.left <= rect.left + 720) {
                  tabRect = tr;
                  tabNode = tabLists[i];
                  break;
                }
              }

              /* The tablist itself hugs its tabs; walk up to the full-width header row. */
              let rowRect = null;
              let rowNode = tabNode ? tabNode.parentElement : null;
              for (let depth = 0; depth < 4 && rowNode; depth += 1) {
                const rr = rowNode.getBoundingClientRect();
                if (rr.width > 600) { rowRect = rr; break; }
                rowNode = rowNode.parentElement;
              }

              const width = 248;
              const vw = document.documentElement.clientWidth || window.innerWidth || 1200;
              const center = rowRect
                ? rowRect.left + rowRect.width / 2
                : (tabRect ? tabRect.left + tabRect.width / 2 : rect.left + 400);
              const next = {
                left: Math.round(Math.max(8, Math.min(vw - width - 8, center - width / 2)) * 10) / 10,
                top: Math.round((tabRect ? tabRect.top - 40 : 14) * 10) / 10,
              };
              setAnchorPos((prev) => (
                prev && Math.abs(prev.left - next.left) < 0.5 && Math.abs(prev.top - next.top) < 0.5
                  ? prev
                  : next
              ));
            };
            const schedule = () => {
              if (frame) cancelAnimationFrame(frame);
              frame = requestAnimationFrame(measure);
            };
            measure();
            window.addEventListener('resize', schedule);
            let observer = null;
            if (typeof ResizeObserver === 'function') {
              observer = new ResizeObserver(schedule);
              if (anchorRef.current && anchorRef.current.parentElement) {
                observer.observe(anchorRef.current.parentElement);
              }
              observer.observe(document.documentElement);
            }
            return () => {
              if (frame) cancelAnimationFrame(frame);
              window.removeEventListener('resize', schedule);
              if (observer) observer.disconnect();
            };
          }, []);

          return h(React.Fragment, null,
            h('span', {
              ref: anchorRef,
              'aria-hidden': 'true',
              style: { display: 'block', width: 0, height: 0, overflow: 'hidden' },
            }),
            anchorPos ? h(CalendarWidget, { ctx, variant: 'header', anchorPos }) : null,
          );
        }

        ctx.slots.inject('conversation.header.leading', () => ctx.slots.register(
          { name: 'conversation.header.leading' },
          CalendarBackgroundSlot,
        ));
      },
    };
  },
});
