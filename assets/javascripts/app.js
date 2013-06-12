jQuery(function(){
    var MyView = Marionette.ItemView.extend({
      template: '#my-view-template'
    });

    var Person = Backbone.Model.extend({
      defaults: {
        "firstName": "Jeremy",
        "lastName": "Ashkenas",
        "email":    "jeremy@example.com"
      }
    });

    var Derick = new Person({
      firstName: 'Derick',
      lastName: 'Bailey',
      email: 'derick@example.com'
    });
    var myRegion = new Marionette.Region({
      el: '#content'
    });

    // show a view in the region
    var view1 = new MyView({
        model: Derick
    });
    myRegion.show(view1);
})