// web framework
const d3 = require('d3/build/d3.js')
const $ = window.jQuery = require('jquery/dist/jquery')

// web style plugin
import 'font-awesome/css/font-awesome.min.css'

// custom modules
import './app.styl'
import './index.pug'

// world information
const world = require('./res/world/PPI/world.json')
const output = require('./res/world/PPI/output.json')

$('.article div').html(output[location.search.replace('?pmid=', '')])

let boxList = d3.select('#leftBar .world').selectAll('.list').data(Object.keys(world.box)).enter()
  .append('div').attr('class', it => `list ${it.match(/1$/) ? 'active' : ''}`).on('click', function(it) {
    $('#leftBar .world .list.active').removeClass('active')
    $(this).addClass('active')

    $('#content').attr('data-box', it)
    $('#content .world').text(it).attr('data-update-date', world.box[it].statistic.updateTime)
    $('#content .boxInfo .paper span').attr({ 'data-paper': world.box[it].statistic.article, 'data-sentence': world.box[it].statistic.twoValueStc })
    $('#content .boxInfo .subject span').attr({ 'data-subject': world.box[it].statistic.subject, 'data-log': world.box[it].statistic.expLogs })
    $('#content .boxInfo .expert span').attr('data-expert', world.box[it].statistic.answer)
  })
boxList.append('i').attr('class', 'fa fa-folder-open-o')
boxList.append('span').text(it => it)

$('#content .world').attr('data-update-date', world.box['Box 1'].statistic.updateTime)
$('#content .boxInfo .paper span').attr({ 'data-paper': world.box['Box 1'].statistic.article, 'data-sentence': world.box['Box 1'].statistic.twoValueStc })
$('#content .boxInfo .subject span').attr({ 'data-subject': world.box['Box 1'].statistic.subject, 'data-log': world.box['Box 1'].statistic.expLogs })
$('#content .boxInfo .expert span').attr('data-expert', world.box['Box 1'].statistic.answer)
