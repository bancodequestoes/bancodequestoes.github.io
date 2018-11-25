
$(function(){

   var savedItems = getItem("saved-items") || [];

   $.each(savedItems, function(i, item){

        var id = item.id;
        var title = item.title;
        var subtitle = item.subtitle;
        var url = item.url;
        var content = item.content;
        var path = item.path;

        $(".search-result").append(getHTMLForSavedItem(id, title, subtitle, url,content, path))
    });

    $(".search-total").html(savedItems.length + " itens salvos");

    $('body').on('click', '.saved-item', function() {

        var id = $(this).data("id");

        var items = getItem("saved-items") || [];

        items = items.filter(i => i.id !== id);

        saveItem("saved-items", items);

        location.reload();
      });
});
