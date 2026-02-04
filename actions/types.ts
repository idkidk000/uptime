export type ActionReturn<DataType,ErrorType extends Error> = Promise<
  {ok:true,data:DataType}|{ok:false,error:ErrorType}
>